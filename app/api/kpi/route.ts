export const dynamic = 'force-dynamic'

import { NextResponse } from 'next/server'
import { createServerClient } from '@/lib/supabase-server'

interface ArInvoice { total: number; due_date: string | null; date: string }

export async function GET() {
  const supabase = createServerClient()

  const today    = new Date()
  const todayStr = today.toISOString().slice(0, 10)
  const daysAgo  = (n: number) => { const d = new Date(today); d.setDate(d.getDate() - n); return d.toISOString().slice(0, 10) }
  const d30 = daysAgo(30); const d60 = daysAgo(60); const d90 = daysAgo(90)

  // VAT: most-recent completed bi-monthly cycle (matches VAT201 defaults)
  const prev2Month = new Date(today.getFullYear(), today.getMonth() - 2, 1)
  const vatFrom    = prev2Month.toISOString().slice(0, 10)
  const vatTo      = new Date(today.getFullYear(), today.getMonth(), 0).toISOString().slice(0, 10)

  // AR invoices paginate independently — wrap so it runs alongside the other queries.
  const arPromise = (async () => {
    const invoices: ArInvoice[] = []
    let offset = 0
    while (true) {
      const { data } = await supabase
        .from('acct_invoices')
        .select('total, due_date, date')
        .in('status', ['sent', 'overdue'])
        .range(offset, offset + 999)
      if (!data?.length) break
      invoices.push(...data.map(i => ({ total: Number(i.total), due_date: i.due_date, date: i.date })))
      if (data.length < 1000) break
      offset += 1000
    }
    return invoices
  })()

  // ── Independent queries in parallel ────────────────────────────────────────
  const [{ data: bankAccounts }, { data: vatAcct }, arInvoices] = await Promise.all([
    supabase.from('acct_bank_accounts').select('id, name, balance').eq('is_active', true),
    supabase.from('acct_accounts').select('id').eq('code', '2100').maybeSingle(),
    arPromise,
  ])

  const cash  = bankAccounts?.reduce((s, b) => s + Number(b.balance), 0) ?? 0
  const banks = bankAccounts?.map(b => ({ name: b.name, balance: Number(b.balance) })) ?? []

  // ── AR + aged analysis ─────────────────────────────────────────────────────
  const ar = arInvoices.reduce((s, i) => s + i.total, 0)
  const arOverdue = arInvoices.filter(i => (i.due_date ?? i.date) < todayStr).length

  const arAging = { current: 0, days30: 0, days60: 0, days90plus: 0 }
  for (const inv of arInvoices) {
    const eff = inv.due_date ?? inv.date
    if (eff >= todayStr)    arAging.current    += inv.total
    else if (eff >= d30)    arAging.days30     += inv.total
    else if (eff >= d60)    arAging.days60     += inv.total
    else                    arAging.days90plus += inv.total
  }

  // ── VAT: single join query for output VAT (2100) over the period ───────────
  let vat = 0
  if (vatAcct) {
    const { data: vlines } = await supabase
      .from('acct_journal_lines')
      .select('debit, credit, acct_journal_entries!inner(date, is_posted)')
      .eq('account_id', vatAcct.id)
      .eq('acct_journal_entries.is_posted', true)
      .gte('acct_journal_entries.date', vatFrom)
      .lte('acct_journal_entries.date', vatTo)
    for (const l of vlines ?? []) vat += Number(l.credit) - Number(l.debit)
  }

  return NextResponse.json({
    cash, banks, ar, arAging, arOverdue, ap: 0,
    vat: Math.round(vat * 100) / 100,
    vatPeriod: { from: vatFrom, to: vatTo },
  })
}
