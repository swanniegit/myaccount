import type { SupabaseClient } from '@supabase/supabase-js'
import { recordJournalEntry } from '@/lib/ledger'

export interface YearEndCloseResult {
  fiscal_year: number
  fy_range: string
  total_revenue: number
  total_expenses: number
  net_profit: number
}

const BATCH = 1000

export async function runYearEndClose(
  supabase: SupabaseClient,
  fiscal_year: number
): Promise<YearEndCloseResult> {
  // Load company settings for tax_year_end (1=Jan … 12=Dec; default 2=Feb)
  const { data: company } = await supabase.from('acct_company').select('tax_year_end').maybeSingle()
  const taxYearEnd: number = company?.tax_year_end ?? 2

  // FY date range
  const fyStartMonth = (taxYearEnd % 12) + 1
  const fyStartYear  = fyStartMonth === 1 ? fiscal_year : fiscal_year - 1
  const fyStart = `${fyStartYear}-${String(fyStartMonth).padStart(2, '0')}-01`

  const fyEndLastDay = new Date(fiscal_year, taxYearEnd, 0).getDate()
  const fyEnd = `${fiscal_year}-${String(taxYearEnd).padStart(2, '0')}-${fyEndLastDay}`
  const closingDate = fyEnd

  // Idempotency: reject if closing journal already exists for this FY
  const { data: existing } = await supabase
    .from('acct_journal_entries')
    .select('id')
    .eq('reference', `YE-${fiscal_year}-CLOSE`)
    .maybeSingle()

  if (existing) {
    throw new Error(`Year-end close for FY${fiscal_year} has already been run (reference YE-${fiscal_year}-CLOSE exists). Reverse the closing entries first if you need to re-run.`)
  }

  // Ensure the closing period is open
  const fyEndMonthNum = taxYearEnd
  const { data: closingPeriod } = await supabase
    .from('acct_periods')
    .select('id, status')
    .eq('year', fiscal_year)
    .eq('month', fyEndMonthNum)
    .maybeSingle()

  if (!closingPeriod) {
    await supabase.from('acct_periods').insert({
      year: fiscal_year,
      month: fyEndMonthNum,
      start_date: `${fiscal_year}-${String(fyEndMonthNum).padStart(2, '0')}-01`,
      end_date: fyEnd,
      status: 'open',
    })
  } else if (closingPeriod.status !== 'open') {
    throw new Error(`Period ${fyEndMonthNum}/${fiscal_year} is closed. Reopen it before running year-end close.`)
  }

  // Load accounts
  const { data: accounts } = await supabase
    .from('acct_accounts')
    .select('id, code, type, sub_type, normal_balance')
    .eq('is_active', true)

  if (!accounts) throw new Error('Failed to load accounts')

  const accById: Record<string, typeof accounts[0]> = {}
  for (const a of accounts) accById[a.id] = a

  const acc3300 = accounts.find(a => a.code === '3300')
  const acc3100 = accounts.find(a => a.code === '3100')
  if (!acc3300 || !acc3100) {
    throw new Error('Accounts 3300 or 3100 not found in chart of accounts')
  }

  // Fetch all posted IS lines for the FY
  let offset = 0
  const totals: Record<string, { debit: number; credit: number }> = {}

  while (true) {
    const { data: batch, error } = await supabase
      .from('acct_journal_lines')
      .select('account_id, debit, credit, acct_journal_entries!inner(date, is_posted)')
      .eq('acct_journal_entries.is_posted', true)
      .gte('acct_journal_entries.date', fyStart)
      .lte('acct_journal_entries.date', fyEnd)
      .range(offset, offset + BATCH - 1)

    if (error) throw new Error(error.message)
    if (!batch || batch.length === 0) break

    for (const l of batch) {
      const acc = accById[l.account_id]
      if (!acc || (acc.type !== 'revenue' && acc.type !== 'expense')) continue
      if (!totals[l.account_id]) totals[l.account_id] = { debit: 0, credit: 0 }
      totals[l.account_id].debit  += Number(l.debit)
      totals[l.account_id].credit += Number(l.credit)
    }

    if (batch.length < BATCH) break
    offset += BATCH
  }

  // Build closing lines: Dr revenue / Cr expenses to zero them out, net to 3300
  let totalRevenue = 0
  let totalExpenses = 0
  const closingLines: { account_id: string; debit: number; credit: number; description: string }[] = []

  for (const [accId, t] of Object.entries(totals)) {
    const acc = accById[accId]
    if (!acc) continue

    if (acc.type === 'revenue') {
      const balance = t.credit - t.debit
      if (balance <= 0) continue
      totalRevenue += balance
      closingLines.push({ account_id: accId, debit: balance, credit: 0, description: `YE Close — ${acc.code}` })
    } else if (acc.type === 'expense') {
      const balance = t.debit - t.credit
      if (balance <= 0) continue
      totalExpenses += balance
      closingLines.push({ account_id: accId, debit: 0, credit: balance, description: `YE Close — ${acc.code}` })
    }
  }

  const netProfit = totalRevenue - totalExpenses

  if (closingLines.length === 0) {
    throw new Error('No revenue or expense balances to close for this FY.')
  }

  // Net to 3300
  closingLines.push(
    netProfit >= 0
      ? { account_id: acc3300.id, debit: 0, credit: netProfit, description: 'YE Close — Net profit to 3300' }
      : { account_id: acc3300.id, debit: Math.abs(netProfit), credit: 0, description: 'YE Close — Net loss to 3300' }
  )

  // Entry 1: Close IS to 3300
  await recordJournalEntry(supabase, {
    date: closingDate,
    description: `Year-end close FY${fiscal_year} — income & expense to 3300`,
    reference: `YE-${fiscal_year}-CLOSE`,
    source: 'year_end',
    lines: closingLines,
  })

  // Entry 2: Roll 3300 → 3100
  const rollupLines = netProfit >= 0
    ? [
        { account_id: acc3300.id, debit: netProfit, credit: 0, description: `YE Rollup FY${fiscal_year}` },
        { account_id: acc3100.id, debit: 0, credit: netProfit, description: `YE Rollup FY${fiscal_year}` },
      ]
    : [
        { account_id: acc3100.id, debit: Math.abs(netProfit), credit: 0, description: `YE Rollup FY${fiscal_year}` },
        { account_id: acc3300.id, debit: 0, credit: Math.abs(netProfit), description: `YE Rollup FY${fiscal_year}` },
      ]

  await recordJournalEntry(supabase, {
    date: closingDate,
    description: `Year-end roll-up FY${fiscal_year} — 3300 to retained earnings`,
    reference: `YE-${fiscal_year}-ROLLUP`,
    source: 'year_end',
    lines: rollupLines,
  })

  // Close only the periods within this FY's date range, not all calendar-year months.
  const closedAt = new Date().toISOString()

  if (fyStartYear === fiscal_year) {
    // Entire FY falls in one calendar year (e.g., Jan–Dec for a Dec year-end)
    await supabase
      .from('acct_periods')
      .update({ status: 'closed', closed_at: closedAt })
      .eq('year', fiscal_year)
      .gte('month', fyStartMonth)
      .lte('month', taxYearEnd)
  } else {
    // FY spans two calendar years (e.g., Mar 2025 – Feb 2026 for a Feb year-end)
    await supabase
      .from('acct_periods')
      .update({ status: 'closed', closed_at: closedAt })
      .eq('year', fyStartYear)
      .gte('month', fyStartMonth)

    await supabase
      .from('acct_periods')
      .update({ status: 'closed', closed_at: closedAt })
      .eq('year', fiscal_year)
      .lte('month', taxYearEnd)

    // Handles the edge case of a 3-year FY span (effectively impossible in normal ops)
    if (fiscal_year - fyStartYear > 1) {
      await supabase
        .from('acct_periods')
        .update({ status: 'closed', closed_at: closedAt })
        .gt('year', fyStartYear)
        .lt('year', fiscal_year)
    }
  }

  return {
    fiscal_year,
    fy_range: `${fyStart} to ${fyEnd}`,
    total_revenue: totalRevenue,
    total_expenses: totalExpenses,
    net_profit: netProfit,
  }
}
