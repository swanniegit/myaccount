export const dynamic = 'force-dynamic'

import { NextResponse } from 'next/server'
import { createServerClient } from '@/lib/supabase-server'

const iso = (d: Date) => d.toISOString().slice(0, 10)

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url)
  const periodStart = searchParams.get('start')   // e.g. '2026-03-01'
  const periodEnd   = searchParams.get('end')     // e.g. '2026-06-01' (exclusive)
  const monthly     = searchParams.get('monthly') === '1' // aggregate by month instead of day

  const supabase = createServerClient()

  // ── Date boundaries (computed first so we only fetch the lines we need) ─────
  const cfStart = periodStart ? new Date(periodStart) : (() => { const d = new Date(); d.setDate(d.getDate() - 29); return d })()
  const cfEnd   = periodEnd   ? new Date(periodEnd)   : new Date(Date.now() + 86400000)
  const cfStartStr = iso(cfStart)
  const cfEndStr   = iso(cfEnd)

  const ieAnchor = periodStart ? new Date(periodStart) : (() => { const d = new Date(); d.setDate(1); return d })()
  const ieStart  = new Date(ieAnchor); ieStart.setMonth(ieStart.getMonth() - 5); ieStart.setDate(1)
  const ieEnd    = new Date(ieAnchor); ieEnd.setMonth(ieEnd.getMonth() + 1); ieEnd.setDate(1) // exclusive

  // Overall window covering both charts — bounds the journal-line fetch.
  const windowStart = iso(new Date(Math.min(cfStart.getTime(), ieStart.getTime())))
  const windowEnd   = iso(new Date(Math.max(cfEnd.getTime(),   ieEnd.getTime())))

  const { data: accounts } = await supabase
    .from('acct_accounts')
    .select('id, code, type, normal_balance')

  if (!accounts) return NextResponse.json({ error: 'no accounts' }, { status: 500 })

  const accById: Record<string, { code: string; type: string; normal_balance: string }> = {}
  for (const a of accounts) accById[a.id] = a

  // Fetch only posted journal lines whose entry date falls in the needed window.
  const allLines: { account_id: string; debit: number; credit: number; date: string }[] = []
  const BATCH = 1000
  let offset = 0

  while (true) {
    const { data: batch } = await supabase
      .from('acct_journal_lines')
      .select('account_id, debit, credit, acct_journal_entries!inner(date, is_posted)')
      .eq('acct_journal_entries.is_posted', true)
      .gte('acct_journal_entries.date', windowStart)
      .lt('acct_journal_entries.date', windowEnd)
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
  const bucketIn:  Record<string, number> = {}
  const bucketOut: Record<string, number> = {}

  if (monthly) {
    const cur = new Date(cfStart)
    cur.setDate(1)
    while (iso(cur) < cfEndStr) {
      const key = iso(cur).slice(0, 7)
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
    const cur = new Date(cfStart)
    while (iso(cur) < cfEndStr) {
      const key = iso(cur)
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
    .map(k => ({ date: k.slice(5), in: Math.max(0, bucketIn[k] ?? 0), out: Math.max(0, bucketOut[k] ?? 0) }))

  // ── Income vs expense: 6 months ending at selected month ─────────────────
  const monthlyIncome:  Record<string, number> = {}
  const monthlyExpense: Record<string, number> = {}

  for (let i = 0; i < 6; i++) {
    const d = new Date(ieStart)
    d.setMonth(d.getMonth() + i)
    const key = iso(d).slice(0, 7)
    monthlyIncome[key]  = 0
    monthlyExpense[key] = 0
  }

  const ieCutoff = iso(ieStart).slice(0, 7)

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
