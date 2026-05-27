'use client'
import { useCallback, useEffect, useState } from 'react'
import Link from 'next/link'
import { supabase } from '@/lib/supabase'
import { ageInvoices, type AgeableInvoice } from '@/lib/ar/aging'
import { computeInterest, postInterestRun, type InterestItem } from '@/lib/customers/charge-interest'
import { formatMoney, today } from '@/lib/utils'
import Button from '@/components/ui/Button'

const money = (n: number) => n.toLocaleString('en-ZA', { minimumFractionDigits: 2 })

export default function InterestChargingPage() {
  const [overdue, setOverdue] = useState<{ name: string; overdue: number }[]>([])
  const [loading, setLoading] = useState(true)
  const [rate, setRate]       = useState('11.5')
  const [date, setDate]       = useState(today())
  const [saving, setSaving]   = useState(false)
  const [error, setError]     = useState('')
  const [done, setDone]       = useState<string | null>(null)

  const load = useCallback(async () => {
    setLoading(true)
    const { data } = await supabase
      .from('acct_invoices')
      .select('total, due_date, date, contact_id, acct_contacts(name)')
      .eq('invoice_type', 'invoice')
      .in('status', ['sent', 'overdue'])

    const byCustomer = new Map<string, { name: string; invoices: AgeableInvoice[] }>()
    for (const i of (data ?? []) as any[]) {
      if (!i.contact_id) continue
      const g: { name: string; invoices: AgeableInvoice[] } = byCustomer.get(i.contact_id) ?? { name: i.acct_contacts?.name ?? '—', invoices: [] }
      g.invoices.push({ total: i.total, due_date: i.due_date, date: i.date })
      byCustomer.set(i.contact_id, g)
    }

    const rows = Array.from(byCustomer.values())
      .map(g => { const a = ageInvoices(g.invoices); return { name: g.name, overdue: a.d30 + a.d60 + a.d90 } })
      .filter(r => r.overdue > 0)
    setOverdue(rows)
    setLoading(false)
  }, [])

  useEffect(() => { load() }, [load])

  const items: InterestItem[] = computeInterest(overdue, parseFloat(rate) || 0)
  const total = items.reduce((s, i) => s + i.interest, 0)

  async function charge() {
    if (total <= 0) { setError('No interest to charge at this rate.'); return }
    setSaving(true); setError(''); setDone(null)
    try {
      const { journalNumber } = await postInterestRun(supabase, { date, items })
      setDone(`Posted interest run JE-${journalNumber ?? '—'} · ${formatMoney(total)} across ${items.length} customers.`)
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e))
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="p-5 max-w-3xl">
      <div className="mb-4">
        <Link href="/customers" className="text-xs text-accent hover:underline">← Customers</Link>
        <h1 className="text-xl font-semibold mt-1">Interest Charging</h1>
        <p className="text-xs mt-0.5 text-ink-2">Finance charges on overdue balances · Dr AR, Cr Interest Income</p>
      </div>

      <div className="flex gap-3 items-end mb-4 flex-wrap">
        <div>
          <label className="field-label">Rate (% p.a.)</label>
          <input type="number" step="0.1" className="field num" style={{ width: 110 }} value={rate} onChange={e => setRate(e.target.value)} />
        </div>
        <div>
          <label className="field-label">Charge date</label>
          <input type="date" className="field" value={date} onChange={e => setDate(e.target.value)} />
        </div>
        <Button size="sm" onClick={charge} disabled={saving || total <= 0}>
          {saving ? 'Posting…' : `Charge interest · ${total > 0 ? formatMoney(total) : 'R 0.00'}`}
        </Button>
      </div>
      <p className="text-xs mb-4 text-muted">Monthly charge = overdue balance × rate ÷ 12. Overdue = balances past due date.</p>

      {error && <p className="text-xs mb-2 text-negative">{error}</p>}
      {done && <p className="text-xs mb-2 text-positive">{done}</p>}

      <div className="card overflow-hidden">
        <table className="w-full text-xs">
          <thead className="t-head">
            <tr>
              <th className="text-left">Customer</th>
              <th className="num">Overdue</th>
              <th className="num">Interest</th>
            </tr>
          </thead>
          <tbody>
            {loading
              ? [...Array(5)].map((_, i) => (
                  <tr key={i} className="t-row">
                    {[...Array(3)].map((_, j) => (
                      <td key={j} className="t-cell"><div className="h-3 rounded animate-pulse bg-paper-edge" /></td>
                    ))}
                  </tr>
                ))
              : items.map((r, i) => (
                  <tr key={i} className="t-row">
                    <td className="t-cell font-medium">{r.name}</td>
                    <td className="t-cell num text-ink-2">{money(r.overdue)}</td>
                    <td className="t-cell num font-semibold">{money(r.interest)}</td>
                  </tr>
                ))}
            {!loading && items.length === 0 && (
              <tr className="t-empty"><td colSpan={3}>No overdue balances to charge interest on</td></tr>
            )}
            {!loading && items.length > 0 && (
              <tr style={{ borderTop: '2px solid var(--paper-edge)' }}>
                <td className="t-cell font-semibold">Total</td>
                <td className="t-cell num text-ink-2">{money(items.reduce((s, i) => s + i.overdue, 0))}</td>
                <td className="t-cell num font-bold">{money(total)}</td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      <div className="notice notice-dashed mt-3" style={{ fontSize: 11 }}>
        Posts one journal entry (Dr AR per customer, Cr 4300 Interest Income). Per-customer AR sub-ledger allocation isn’t modelled yet.
      </div>
    </div>
  )
}
