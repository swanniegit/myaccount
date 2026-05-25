export const dynamic = 'force-dynamic'

import { NextResponse } from 'next/server'
import { createServerClient } from '@/lib/supabase-server'

export async function GET() {
  const supabase = createServerClient()

  // ── Bank / Cash ────────────────────────────────────────────────────────────
  const { data: bankAccounts } = await supabase
    .from('acct_bank_accounts')
    .select('id, name, balance')
    .eq('is_active', true)
  const cash  = bankAccounts?.reduce((s, b) => s + Number(b.balance), 0) ?? 0
  const banks = bankAccounts?.map(b => ({ name: b.name, balance: Number(b.balance) })) ?? []

  // ── AR + aged analysis ─────────────────────────────────────────────────────
  const today = new Date()
  const todayStr = today.toISOString().slice(0, 10)
  function daysAgo(n: number) {
    const d = new Date(today); d.setDate(d.getDate() - n); return d.toISOString().slice(0, 10)
  }
  const d30 = daysAgo(30); const d60 = daysAgo(60); const d90 = daysAgo(90)

  const arInvoices: { total: number; due_date: string | null; date: string }[] = []
  let arOffset = 0
  while (true) {
    const { data } = await supabase
      .from('acct_invoices')
      .select('total, due_date, date')
      .in('status', ['sent', 'overdue'])
      .range(arOffset, arOffset + 999)
    if (!data?.length) break
    arInvoices.push(...data.map(i => ({ total: Number(i.total), due_date: i.due_date, date: i.date })))
    if (data.length < 1000) break
    arOffset += 1000
  }

  const ar = arInvoices.reduce((s, i) => s + i.total, 0)
  const arOverdue = arInvoices.filter(i => {
    const eff = i.due_date ?? i.date
    return eff < todayStr
  }).length

  // Aging buckets — keyed off effective due date
  const arAging = { current: 0, days30: 0, days60: 0, days90plus: 0 }
  for (const inv of arInvoices) {
    const eff = inv.due_date ?? inv.date
    if (eff >= todayStr)    arAging.current   += inv.total
    else if (eff >= d30)    arAging.days30    += inv.total
    else if (eff >= d60)    arAging.days60    += inv.total
    else                    arAging.days90plus += inv.total
  }

  // ── VAT: current period output VAT from 2100 journal lines ────────────────
  // Most-recent completed bi-monthly cycle (matches VAT201 defaults)
  const prevMonth  = new Date(today.getFullYear(), today.getMonth() - 1, 1)
  const prev2Month = new Date(today.getFullYear(), today.getMonth() - 2, 1)
  const vatFrom    = prev2Month.toISOString().slice(0, 10)
  const vatTo      = new Date(today.getFullYear(), today.getMonth(), 0).toISOString().slice(0, 10)

  const { data: vatAcct } = await supabase
    .from('acct_accounts').select('id').eq('code', '2100').single()

  let vat = 0
  if (vatAcct) {
    const { data: vatEntries } = await supabase
      .from('acct_journal_entries').select('id').gte('date', vatFrom).lte('date', vatTo).eq('is_posted', true)
    if (vatEntries?.length) {
      const BATCH = 500
      for (let i = 0; i < vatEntries.length; i += BATCH) {
        const { data: vlines } = await supabase
          .from('acct_journal_lines').select('debit, credit')
          .in('entry_id', vatEntries.slice(i, i + BATCH).map(e => e.id))
          .eq('account_id', vatAcct.id)
        for (const l of vlines ?? []) vat += Number(l.credit) - Number(l.debit)
      }
    }
  }

  return NextResponse.json({
    cash, banks, ar, arAging, arOverdue, ap: 0,
    vat: Math.round(vat * 100) / 100,
    vatPeriod: { from: vatFrom, to: vatTo },
  })
}
