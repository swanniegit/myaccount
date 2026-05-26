export const dynamic = 'force-dynamic'

import { NextResponse } from 'next/server'
import type { SupabaseClient } from '@supabase/supabase-js'
import { createServerClient } from '@/lib/supabase-server'

const iso = (d: Date) => d.toISOString().slice(0, 10)

interface Bucket { bucket: string; income: number; expense: number }
interface DateBounds { cfStart: Date; cfEnd: Date; ieStart: Date; ieEnd: Date; monthly: boolean }

function rpcUnavailable(error: { code?: string; message?: string }): boolean {
  return (
    error.code === 'PGRST202' ||
    error.message?.includes('acct_income_expense') === true ||
    error.message?.includes('Could not find the function') === true
  )
}

/** Pre-fill the 6 income/expense months, then overlay aggregated buckets (clamped ≥ 0). */
function buildIncomeExpense(rows: Bucket[], ieStart: Date) {
  const map = new Map(rows.map(r => [r.bucket, r]))
  const out: { month: string; income: number; expense: number }[] = []
  for (let i = 0; i < 6; i++) {
    const d = new Date(ieStart); d.setMonth(d.getMonth() + i)
    const key = iso(d).slice(0, 7)
    const r = map.get(key)
    out.push({ month: key, income: Math.max(0, Number(r?.income ?? 0)), expense: Math.max(0, Number(r?.expense ?? 0)) })
  }
  return out
}

/** Pre-fill each day/month bucket in the cash-flow window, then overlay aggregates. */
function buildCashFlow(rows: Bucket[], cfStart: Date, cfEnd: Date, monthly: boolean) {
  const map = new Map(rows.map(r => [r.bucket, r]))
  const keys: string[] = []
  const cur = new Date(cfStart)
  if (monthly) cur.setDate(1)
  const endStr = iso(cfEnd)
  while (iso(cur) < endStr) {
    keys.push(monthly ? iso(cur).slice(0, 7) : iso(cur))
    if (monthly) cur.setMonth(cur.getMonth() + 1)
    else cur.setDate(cur.getDate() + 1)
  }
  return keys.map(k => {
    const r = map.get(k)
    return { date: k.slice(5), in: Math.max(0, Number(r?.income ?? 0)), out: Math.max(0, Number(r?.expense ?? 0)) }
  })
}

interface ChartResult { incomeExpense: ReturnType<typeof buildIncomeExpense>; cashFlow: ReturnType<typeof buildCashFlow> }

async function viaRpc(supabase: SupabaseClient, b: DateBounds): Promise<{ data?: ChartResult; error?: { code?: string; message?: string } }> {
  const [ie, cf] = await Promise.all([
    supabase.rpc('acct_income_expense', { p_start: iso(b.ieStart), p_end: iso(b.ieEnd), p_monthly: true }),
    supabase.rpc('acct_income_expense', { p_start: iso(b.cfStart), p_end: iso(b.cfEnd), p_monthly: b.monthly }),
  ])
  if (ie.error) return { error: ie.error }
  if (cf.error) return { error: cf.error }
  return {
    data: {
      incomeExpense: buildIncomeExpense((ie.data ?? []) as Bucket[], b.ieStart),
      cashFlow: buildCashFlow((cf.data ?? []) as Bucket[], b.cfStart, b.cfEnd, b.monthly),
    },
  }
}

/** Fallback: fetch posted P&L lines in-window and aggregate in JS (used if the RPC is absent). */
async function viaLines(supabase: SupabaseClient, b: DateBounds) {
  const { data: accounts } = await supabase.from('acct_accounts').select('id, type, normal_balance')
  const accById: Record<string, { type: string; normal_balance: string }> = {}
  const pnlIds: string[] = []
  for (const a of accounts ?? []) {
    accById[a.id] = a
    if (a.type === 'revenue' || a.type === 'expense') pnlIds.push(a.id)
  }

  const windowStart = iso(new Date(Math.min(b.cfStart.getTime(), b.ieStart.getTime())))
  const windowEnd   = iso(new Date(Math.max(b.cfEnd.getTime(), b.ieEnd.getTime())))

  const lines: { account_id: string; debit: number; credit: number; date: string }[] = []
  const BATCH = 1000
  let offset = 0
  while (pnlIds.length > 0) {
    const { data: batch } = await supabase
      .from('acct_journal_lines')
      .select('account_id, debit, credit, acct_journal_entries!inner(date, is_posted)')
      .in('account_id', pnlIds)
      .eq('acct_journal_entries.is_posted', true)
      .gte('acct_journal_entries.date', windowStart)
      .lt('acct_journal_entries.date', windowEnd)
      .range(offset, offset + BATCH - 1)
    if (!batch || batch.length === 0) break
    for (const l of batch) {
      const entry = (l as any).acct_journal_entries
      if (entry?.date) lines.push({ account_id: l.account_id, debit: Number(l.debit), credit: Number(l.credit), date: entry.date })
    }
    if (batch.length < BATCH) break
    offset += BATCH
  }

  const bucketKey = (date: string, monthly: boolean) => monthly ? date.slice(0, 7) : date.slice(0, 10)
  const agg = (start: Date, end: Date, monthly: boolean): Bucket[] => {
    const startStr = iso(start), endStr = iso(end)
    const m = new Map<string, Bucket>()
    for (const l of lines) {
      const day = l.date.slice(0, 10)
      if (day < startStr || day >= endStr) continue
      const acc = accById[l.account_id]
      if (!acc) continue
      const key = bucketKey(day, monthly)
      const row = m.get(key) ?? { bucket: key, income: 0, expense: 0 }
      if (acc.type === 'revenue') row.income  += acc.normal_balance === 'credit' ? l.credit - l.debit : l.debit - l.credit
      if (acc.type === 'expense') row.expense += acc.normal_balance === 'debit'  ? l.debit - l.credit : l.credit - l.debit
      m.set(key, row)
    }
    return Array.from(m.values())
  }

  return {
    incomeExpense: buildIncomeExpense(agg(b.ieStart, b.ieEnd, true), b.ieStart),
    cashFlow: buildCashFlow(agg(b.cfStart, b.cfEnd, b.monthly), b.cfStart, b.cfEnd, b.monthly),
  }
}

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url)
  const periodStart = searchParams.get('start')
  const periodEnd   = searchParams.get('end')
  const monthly     = searchParams.get('monthly') === '1'

  const supabase = createServerClient()

  const cfStart = periodStart ? new Date(periodStart) : (() => { const d = new Date(); d.setDate(d.getDate() - 29); return d })()
  const cfEnd   = periodEnd   ? new Date(periodEnd)   : new Date(Date.now() + 86400000)
  const ieAnchor = periodStart ? new Date(periodStart) : (() => { const d = new Date(); d.setDate(1); return d })()
  const ieStart  = new Date(ieAnchor); ieStart.setMonth(ieStart.getMonth() - 5); ieStart.setDate(1)
  const ieEnd    = new Date(ieAnchor); ieEnd.setMonth(ieEnd.getMonth() + 1); ieEnd.setDate(1)

  const bounds: DateBounds = { cfStart, cfEnd, ieStart, ieEnd, monthly }

  const rpc = await viaRpc(supabase, bounds)
  if (rpc.data) return NextResponse.json(rpc.data)
  if (rpc.error && !rpcUnavailable(rpc.error)) {
    return NextResponse.json({ error: rpc.error.message }, { status: 500 })
  }

  return NextResponse.json(await viaLines(supabase, bounds))
}
