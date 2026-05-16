export const dynamic = 'force-dynamic'

import { NextResponse } from 'next/server'
import { createServerClient } from '@/lib/supabase-server'

export async function GET() {
  const supabase = createServerClient()

  // Overdue invoices (status = sent|partial, due_date < today)
  const today = new Date().toISOString().slice(0, 10)
  const { data: overdueInvoices } = await supabase
    .from('acct_invoices')
    .select('total, due_date')
    .in('status', ['sent', 'partial'])
    .lt('due_date', today)

  const overdueCount  = overdueInvoices?.length ?? 0
  const overdueAmount = overdueInvoices?.reduce((s, i) => s + Number(i.total), 0) ?? 0

  // All journal lines with date for sparklines
  const allLines: { account_id: string; debit: number; credit: number; date: string }[] = []
  const BATCH = 1000
  let offset = 0

  while (true) {
    const { data: batch } = await supabase
      .from('acct_journal_lines')
      .select('account_id, debit, credit, acct_journal_entries(date)')
      .range(offset, offset + BATCH - 1)

    if (!batch || batch.length === 0) break
    for (const l of batch) {
      const entry = (l as any).acct_journal_entries
      if (entry?.date) allLines.push({ account_id: l.account_id, debit: Number(l.debit), credit: Number(l.credit), date: entry.date })
    }
    if (batch.length < BATCH) break
    offset += BATCH
  }

  const { data: accounts } = await supabase.from('acct_accounts').select('id, code, type, normal_balance')
  const accById: Record<string, { code: string; type: string; normal_balance: string }> = {}
  for (const a of (accounts ?? [])) accById[a.id] = a

  // 6-month profit sparkline (monthly income - expense)
  const sixMonthsAgo = new Date()
  sixMonthsAgo.setMonth(sixMonthsAgo.getMonth() - 5)
  sixMonthsAgo.setDate(1)
  const sixCutoff = sixMonthsAgo.toISOString().slice(0, 10)

  const monthlyIncome: Record<string, number> = {}
  const monthlyExpense: Record<string, number> = {}
  for (let i = 0; i < 6; i++) {
    const d = new Date(sixMonthsAgo)
    d.setMonth(d.getMonth() + i)
    const key = d.toISOString().slice(0, 7)
    monthlyIncome[key] = 0
    monthlyExpense[key] = 0
  }

  // 30-day cash sparkline (running daily balance for cash accounts 1000/1010/1020)
  const cashCodes = new Set(['1000', '1010', '1020'])
  const cashAccIds = new Set((accounts ?? []).filter(a => cashCodes.has(a.code)).map(a => a.id))

  const cutoff30 = new Date()
  cutoff30.setDate(cutoff30.getDate() - 29)
  const cutoff30str = cutoff30.toISOString().slice(0, 10)

  const dailyCashDelta: Record<string, number> = {}
  for (let i = 0; i < 30; i++) {
    const d = new Date(cutoff30)
    d.setDate(d.getDate() + i)
    dailyCashDelta[d.toISOString().slice(0, 10)] = 0
  }

  // Base cash balance before the 30-day window
  let baseCash = 0

  for (const l of allLines) {
    const acc = accById[l.account_id]
    if (!acc) continue
    const day = l.date.slice(0, 10)
    const month = l.date.slice(0, 7)

    // Profit sparkline
    if (month in monthlyIncome) {
      if (acc.type === 'income')  monthlyIncome[month]  += acc.normal_balance === 'credit' ? l.credit - l.debit : l.debit - l.credit
      if (acc.type === 'expense') monthlyExpense[month] += acc.normal_balance === 'debit'  ? l.debit - l.credit : l.credit - l.debit
    }

    // Cash sparkline
    if (cashAccIds.has(l.account_id)) {
      const delta = acc.normal_balance === 'debit' ? l.debit - l.credit : l.credit - l.debit
      if (day < cutoff30str) {
        baseCash += delta
      } else if (day in dailyCashDelta) {
        dailyCashDelta[day] += delta
      }
    }
  }

  // Build cumulative cash series
  let running = baseCash
  const cashSparkline = Object.keys(dailyCashDelta).sort().map(day => {
    running += dailyCashDelta[day]
    return { d: day.slice(5), v: Math.max(0, running) }
  })

  const profitSparkline = Object.keys(monthlyIncome).sort().map(m => ({
    d: m.slice(5),
    v: monthlyIncome[m] - monthlyExpense[m],
  }))

  // AR sparkline: monthly AR inflows (invoices created per month)
  const arSparkline = Object.keys(monthlyIncome).sort().map(m => {
    // Use income as proxy for AR inflow
    return { d: m.slice(5), v: Math.max(0, monthlyIncome[m]) }
  })

  return NextResponse.json({ overdueCount, overdueAmount, cashSparkline, profitSparkline, arSparkline })
}
