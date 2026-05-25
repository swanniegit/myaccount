import { NextResponse } from 'next/server'
import { createServerClient } from '@/lib/supabase-server'

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url)
  const periodStart = searchParams.get('start')   // e.g. '2026-03-01'
  const periodEnd   = searchParams.get('end')     // e.g. '2026-06-01' (exclusive)
  const monthly     = searchParams.get('monthly') === '1' // aggregate by month instead of day

  const supabase = createServerClient()

  const { data: accounts } = await supabase
    .from('acct_accounts')
    .select('id, code, type, normal_balance')

  if (!accounts) return NextResponse.json({ error: 'no accounts' }, { status: 500 })

  const accById: Record<string, { code: string; type: string; normal_balance: string }> = {}
  for (const a of accounts) accById[a.id] = a

  // Fetch all journal lines with their entry date
  const allLines: { account_id: string; debit: number; credit: number; date: string }[] = []
  const BATCH = 1000
  let offset = 0

  while (true) {
    const { data: batch } = await supabase
      .from('acct_journal_lines')
      .select('account_id, debit, credit, acct_journal_entries!inner(date, is_posted)')
      .eq('acct_journal_entries.is_posted', true)
      .range(offset, offset + BATCH - 1)

    if (!batch || batch.length === 0) break

    for (const l of batch) {
      const entry = (l as any).acct_journal_entries
      if (entry?.date) {
        allLines.push({ account_id: l.account_id, debit: Number(l.debit), credit: Number(l.credit), date: entry.date })
      }
    }

    if (batch.length < BATCH) break
    offset += BATCH
  }

  // ── Cash flow ────────────────────────────────────────────────────────────
  const cfStart = periodStart ? new Date(periodStart) : (() => { const d = new Date(); d.setDate(d.getDate() - 29); return d })()
  const cfEnd   = periodEnd   ? new Date(periodEnd)   : new Date(Date.now() + 86400000)

  const cfStartStr = cfStart.toISOString().slice(0, 10)
  const cfEndStr   = cfEnd.toISOString().slice(0, 10)

  const bucketIn:  Record<string, number> = {}
  const bucketOut: Record<string, number> = {}

  if (monthly) {
    // Pre-fill months
    const cur = new Date(cfStart)
    cur.setDate(1)
    while (cur.toISOString().slice(0, 10) < cfEndStr) {
      const key = cur.toISOString().slice(0, 7)
      bucketIn[key]  = 0
      bucketOut[key] = 0
      cur.setMonth(cur.getMonth() + 1)
    }
    for (const l of allLines) {
      const day = l.date.slice(0, 10)
      if (day < cfStartStr || day >= cfEndStr) continue
      const key = day.slice(0, 7)
      if (!(key in bucketIn)) continue
      const acc = accById[l.account_id]
      if (!acc) continue
      if (acc.type === 'revenue') bucketIn[key]  = (bucketIn[key]  ?? 0) + (acc.normal_balance === 'credit' ? l.credit - l.debit : l.debit - l.credit)
      if (acc.type === 'expense') bucketOut[key] = (bucketOut[key] ?? 0) + (acc.normal_balance === 'debit'  ? l.debit - l.credit  : l.credit - l.debit)
    }
  } else {
    // Pre-fill days
    const cur = new Date(cfStart)
    while (cur.toISOString().slice(0, 10) < cfEndStr) {
      const key = cur.toISOString().slice(0, 10)
      bucketIn[key]  = 0
      bucketOut[key] = 0
      cur.setDate(cur.getDate() + 1)
    }
    for (const l of allLines) {
      const day = l.date.slice(0, 10)
      if (day < cfStartStr || day >= cfEndStr) continue
      const acc = accById[l.account_id]
      if (!acc) continue
      if (acc.type === 'revenue') bucketIn[day]  = (bucketIn[day]  ?? 0) + (acc.normal_balance === 'credit' ? l.credit - l.debit : l.debit - l.credit)
      if (acc.type === 'expense') bucketOut[day] = (bucketOut[day] ?? 0) + (acc.normal_balance === 'debit'  ? l.debit - l.credit  : l.credit - l.debit)
    }
  }

  const cashFlow = Object.keys(bucketIn)
    .sort()
    .map(k => ({ date: monthly ? k.slice(5) : k.slice(5), in: Math.max(0, bucketIn[k] ?? 0), out: Math.max(0, bucketOut[k] ?? 0) }))

  // ── Income vs expense: 6 months ending at selected month ─────────────────
  const ieAnchor = periodStart ? new Date(periodStart) : (() => { const d = new Date(); d.setDate(1); return d })()
  const ieStart  = new Date(ieAnchor)
  ieStart.setMonth(ieStart.getMonth() - 5)

  const monthlyIncome:  Record<string, number> = {}
  const monthlyExpense: Record<string, number> = {}

  for (let i = 0; i < 6; i++) {
    const d = new Date(ieStart)
    d.setMonth(d.getMonth() + i)
    const key = d.toISOString().slice(0, 7)
    monthlyIncome[key]  = 0
    monthlyExpense[key] = 0
  }

  const ieCutoff = ieStart.toISOString().slice(0, 7)

  for (const l of allLines) {
    const month = l.date.slice(0, 7)
    if (month < ieCutoff || !(month in monthlyIncome)) continue
    const acc = accById[l.account_id]
    if (!acc) continue
    if (acc.type === 'revenue') monthlyIncome[month]  += acc.normal_balance === 'credit' ? l.credit - l.debit : l.debit - l.credit
    if (acc.type === 'expense') monthlyExpense[month] += acc.normal_balance === 'debit'  ? l.debit - l.credit : l.credit - l.debit
  }

  const incomeExpense = Object.keys(monthlyIncome)
    .sort()
    .map(m => ({ month: m, income: Math.max(0, monthlyIncome[m]), expense: Math.max(0, monthlyExpense[m]) }))

  return NextResponse.json({ cashFlow, incomeExpense })
}
