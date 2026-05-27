'use client'
import { useEffect, useState } from 'react'
import Link from 'next/link'
import { supabase } from '@/lib/supabase'
import MonthPicker, { currentMonth, monthRange, type MonthValue } from '@/components/ui/MonthPicker'

interface Row { name: string; count: number; subtotal: number; vat: number; total: number }

const money = (n: number) => n.toLocaleString('en-ZA', { minimumFractionDigits: 2 })

export default function SalesAnalysisPage() {
  const [rows, setRows]   = useState<Row[]>([])
  const [loading, setLoading] = useState(true)
  const [period, setPeriod] = useState<MonthValue>(currentMonth())

  useEffect(() => { load() }, [period])

  async function load() {
    setLoading(true)
    const { start, end } = monthRange(period)
    const { data } = await supabase
      .from('acct_invoices')
      .select('subtotal, vat_amount, total, contact_id, acct_contacts(name)')
      .eq('invoice_type', 'invoice')
      .in('status', ['sent', 'overdue', 'paid'])
      .gte('date', start).lt('date', end)

    const byCustomer = new Map<string, Row>()
    for (const i of (data ?? []) as any[]) {
      const key = i.contact_id ?? (i.acct_contacts?.name ?? '—')
      const r = byCustomer.get(key) ?? { name: i.acct_contacts?.name ?? '—', count: 0, subtotal: 0, vat: 0, total: 0 }
      r.count += 1
      r.subtotal += Number(i.subtotal)
      r.vat += Number(i.vat_amount)
      r.total += Number(i.total)
      byCustomer.set(key, r)
    }
    setRows(Array.from(byCustomer.values()).sort((a, b) => b.subtotal - a.subtotal))
    setLoading(false)
  }

  const tot = rows.reduce(
    (a, b) => ({ count: a.count + b.count, subtotal: a.subtotal + b.subtotal, vat: a.vat + b.vat, total: a.total + b.total }),
    { count: 0, subtotal: 0, vat: 0, total: 0 }
  )

  return (
    <div className="p-5 max-w-4xl">
      <div className="flex items-start justify-between mb-4">
        <div>
          <Link href="/customers/reports" className="text-xs text-accent hover:underline">← Reports</Link>
          <h1 className="text-xl font-semibold mt-1">Sales Analysis</h1>
          <p className="text-xs mt-0.5 text-ink-2">Revenue by customer · issued invoices · excl VAT</p>
        </div>
        <MonthPicker value={period} onChange={setPeriod} />
      </div>

      <div className="card overflow-hidden">
        <table className="w-full text-xs">
          <thead className="t-head">
            <tr>
              <th className="text-left">Customer</th>
              <th className="num">Invoices</th>
              <th className="num">Revenue</th>
              <th className="num">VAT</th>
              <th className="num">Total</th>
            </tr>
          </thead>
          <tbody>
            {loading
              ? [...Array(6)].map((_, i) => (
                  <tr key={i} className="t-row">
                    {[...Array(5)].map((_, j) => (
                      <td key={j} className="t-cell"><div className="h-3 rounded animate-pulse bg-paper-edge" /></td>
                    ))}
                  </tr>
                ))
              : rows.map((r, i) => (
                  <tr key={i} className="t-row">
                    <td className="t-cell font-medium">{r.name}</td>
                    <td className="t-cell num text-ink-2">{r.count}</td>
                    <td className="t-cell num font-semibold">{money(r.subtotal)}</td>
                    <td className="t-cell num text-ink-2">{money(r.vat)}</td>
                    <td className="t-cell num">{money(r.total)}</td>
                  </tr>
                ))}
            {!loading && rows.length === 0 && (
              <tr className="t-empty"><td colSpan={5}>No invoiced sales this month</td></tr>
            )}
            {!loading && rows.length > 0 && (
              <tr style={{ borderTop: '2px solid var(--paper-edge)' }}>
                <td className="t-cell font-semibold">Total</td>
                <td className="t-cell num font-semibold">{tot.count}</td>
                <td className="t-cell num font-bold">{money(tot.subtotal)}</td>
                <td className="t-cell num font-semibold">{money(tot.vat)}</td>
                <td className="t-cell num font-semibold">{money(tot.total)}</td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  )
}
