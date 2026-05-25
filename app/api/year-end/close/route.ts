import { NextRequest, NextResponse } from 'next/server'
import { createServerClient } from '@/lib/supabase-server'
import { recordJournalEntry } from '@/lib/ledger'
import { requireApiKey } from '@/lib/livehis-push/auth'

// POST /api/year-end/close
// Body: { fiscal_year: number }
// Closes revenue and expense accounts into 3300 (Current Year Earnings),
// then rolls 3300 into 3100 (Retained Earnings). Closes all FY periods.
export async function POST(req: NextRequest) {
  const authError = requireApiKey(req)
  if (authError) return authError

  let body: { fiscal_year: number }
  try { body = await req.json() } catch {
    return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 })
  }

  const { fiscal_year } = body
  if (!fiscal_year) return NextResponse.json({ error: 'Missing fiscal_year' }, { status: 400 })

  const supabase = createServerClient()

  // Load company settings for tax_year_end (1=Jan … 12=Dec; default 2=Feb)
  const { data: company } = await supabase.from('acct_company').select('tax_year_end').maybeSingle()
  const taxYearEnd: number = company?.tax_year_end ?? 2

  // FY date range: start = month after tax_year_end of prior year, end = tax_year_end of fiscal_year
  const fyStartMonth = (taxYearEnd % 12) + 1  // 2→3 (Mar), 12→1 (Jan)
  const fyStartYear  = fyStartMonth === 1 ? fiscal_year : fiscal_year - 1
  const fyStart = `${fyStartYear}-${String(fyStartMonth).padStart(2, '0')}-01`

  // End = last day of tax_year_end month
  const fyEndLastDay = new Date(fiscal_year, taxYearEnd, 0).getDate()
  const fyEnd = `${fiscal_year}-${String(taxYearEnd).padStart(2, '0')}-${fyEndLastDay}`

  // Closing date = last day of FY
  const closingDate = fyEnd

  // Ensure the closing period is open (create it if missing)
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
    return NextResponse.json({ error: `Period ${fyEndMonthNum}/${fiscal_year} is closed. Reopen it before running year-end close.` }, { status: 422 })
  }

  // Look up account IDs
  const { data: accounts } = await supabase
    .from('acct_accounts')
    .select('id, code, type, sub_type, normal_balance')
    .eq('is_active', true)

  if (!accounts) return NextResponse.json({ error: 'Failed to load accounts' }, { status: 500 })

  const accById: Record<string, typeof accounts[0]> = {}
  for (const a of accounts) accById[a.id] = a

  const acc3300 = accounts.find(a => a.code === '3300')
  const acc3100 = accounts.find(a => a.code === '3100')
  if (!acc3300 || !acc3100) return NextResponse.json({ error: 'Accounts 3300 or 3100 not found in chart of accounts' }, { status: 500 })

  // Fetch all posted IS lines for the FY
  const BATCH = 1000
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

    if (error) return NextResponse.json({ error: error.message }, { status: 500 })
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

  // Compute closing journal lines
  // Revenue accounts: normal_balance=credit → balance = credits - debits → Dr revenue, Cr 3300
  // Expense accounts: normal_balance=debit  → balance = debits - credits → Dr 3300, Cr expenses

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
    return NextResponse.json({ message: 'No revenue or expense balances to close', netProfit: 0 })
  }

  // Net to 3300
  if (netProfit >= 0) {
    closingLines.push({ account_id: acc3300.id, debit: 0, credit: netProfit, description: 'YE Close — Net profit to 3300' })
  } else {
    closingLines.push({ account_id: acc3300.id, debit: Math.abs(netProfit), credit: 0, description: 'YE Close — Net loss to 3300' })
  }

  try {
    // Entry 1: Close IS to 3300
    await recordJournalEntry(supabase, {
      date: closingDate,
      description: `Year-end close FY${fiscal_year} — income & expense to 3300`,
      reference: `YE-${fiscal_year}-CLOSE`,
      source: 'manual',
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
      source: 'manual',
      lines: rollupLines,
    })
  } catch (err) {
    return NextResponse.json({ error: (err as Error).message }, { status: 422 })
  }

  // Close all periods in the FY
  await supabase
    .from('acct_periods')
    .update({ status: 'closed', closed_at: new Date().toISOString() })
    .gte('year', fyStartYear)
    .lte('year', fiscal_year)

  return NextResponse.json({
    success: true,
    fiscal_year,
    fy_range: `${fyStart} to ${fyEnd}`,
    total_revenue: totalRevenue,
    total_expenses: totalExpenses,
    net_profit: netProfit,
  })
}
