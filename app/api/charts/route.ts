import { NextResponse } from 'next/server'
import { createServerClient } from '@/lib/supabase-server'

export async function GET() {
  const supabase = createServerClient()

  // Account metadata
  const { data: accounts } = await supabase
    .from('acct_accounts')
    .select('id, code, type, normal_balance')

  if (!accounts) return NextResponse.json({ error: 'no accounts' }, { status: 500 })

  const accById: Record<string, { code: string; type: string; normal_balance: string }> = {}
  for (const a of accounts) accById[a.id] = a

  // All journal lines with their entry date
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
      if (entry?.date) {
        allLines.push({ account_id: l.account_id, debit: Number(l.debit), credit: Number(l.credit), date: entry.date })
      }
    }

    if (batch.length < BATCH) break
    offset += BATCH
  }

  // ── Cash flow: last 30 days ──────────────────────────────────────────────
  // "money in" = credits to income accounts (4xxx) on that day
  // "money out" = debits to expense accounts (5xxx, 6xxx) on that day
  const today = new Date()
  const cutoff = new Date(today)
  cutoff.setDate(cutoff.getDate() - 29)
  const cutoffStr = cutoff.toISOString().slice(0, 10)

  const dailyIn: Record<string, number> = {}
  const dailyOut: Record<string, number> = {}

  for (let i = 0; i < 30; i++) {
    const d = new Date(cutoff)
    d.setDate(d.getDate() + i)
    const key = d.toISOString().slice(0, 10)
    dailyIn[key] = 0
    dailyOut[key] = 0
  }

  for (const l of allLines) {
    if (l.date < cutoffStr) continue
    const acc = accById[l.account_id]
    if (!acc) continue
    const day = l.date.slice(0, 10)
    if (acc.type === 'income') {
      dailyIn[day] = (dailyIn[day] ?? 0) + (acc.normal_balance === 'credit' ? l.credit - l.debit : l.debit - l.credit)
    } else if (acc.type === 'expense') {
      dailyOut[day] = (dailyOut[day] ?? 0) + (acc.normal_balance === 'debit' ? l.debit - l.credit : l.credit - l.debit)
    }
  }

  const cashFlow = Object.keys(dailyIn)
    .sort()
    .map(d => ({
      date: d.slice(5),  // MM-DD
      in: Math.max(0, dailyIn[d] ?? 0),
      out: Math.max(0, dailyOut[d] ?? 0),
    }))

  // ── Income vs expense: last 6 months ────────────────────────────────────
  const monthlyIncome: Record<string, number> = {}
  const monthlyExpense: Record<string, number> = {}

  const sixMonthsAgo = new Date(today)
  sixMonthsAgo.setMonth(sixMonthsAgo.getMonth() - 5)
  sixMonthsAgo.setDate(1)
  const sixCutoff = sixMonthsAgo.toISOString().slice(0, 10)

  // Pre-fill 6 months
  for (let i = 0; i < 6; i++) {
    const d = new Date(sixMonthsAgo)
    d.setMonth(d.getMonth() + i)
    const key = d.toISOString().slice(0, 7)
    monthlyIncome[key] = 0
    monthlyExpense[key] = 0
  }

  for (const l of allLines) {
    if (l.date < sixCutoff) continue
    const acc = accById[l.account_id]
    if (!acc) continue
    const month = l.date.slice(0, 7)
    if (!(month in monthlyIncome)) continue

    if (acc.type === 'income') {
      monthlyIncome[month] += acc.normal_balance === 'credit' ? l.credit - l.debit : l.debit - l.credit
    } else if (acc.type === 'expense') {
      monthlyExpense[month] += acc.normal_balance === 'debit' ? l.debit - l.credit : l.credit - l.debit
    }
  }

  const incomeExpense = Object.keys(monthlyIncome)
    .sort()
    .map(m => ({
      month: m.slice(0, 7),
      income: Math.max(0, monthlyIncome[m]),
      expense: Math.max(0, monthlyExpense[m]),
    }))

  return NextResponse.json({ cashFlow, incomeExpense })
}
