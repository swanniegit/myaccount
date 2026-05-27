'use client'
import { useCallback, useEffect, useState } from 'react'
import Link from 'next/link'
import { supabase } from '@/lib/supabase'
import { ageInvoices, type AgeableInvoice } from '@/lib/ar/aging'

interface Bucket { name: string; current: number; d30: number; d60: number; d90: number; total: number }

const money = (n: number) => n.toLocaleString('en-ZA', { minimumFractionDigits: 2 })
const cell = (n: number) => n > 0 ? money(n) : '–'

export default function AgeAnalysisPage() {
  const [rows, setRows]   = useState<Bucket[]>([])
  const [loading, setLoading] = useState(true)

  const load = useCallback(async () => {
    setLoading(true)
    const { data } = await supabase
      .from('acct_invoices')
      .select('total, due_date, date, contact_id, acct_contacts(name)')
      .eq('invoice_type', 'invoice')
      .in('status', ['sent', 'overdue'])

    const byCustomer = new Map<string, { name: string; invoices: AgeableInvoice[] }>()
    for (const i of (data ?? []) as any[]) {
      const key = i.contact_id ?? (i.acct_contacts?.name ?? '—')
      const g: { name: string; invoices: AgeableInvoice[] } = byCustomer.get(key) ?? { name: i.acct_contacts?.name ?? '—', invoices: [] }
      g.invoices.push({ total: i.total, due_date: i.due_date, date: i.date })
      byCustomer.set(key, g)
    }

    const result: Bucket[] = Array.from(byCustomer.values()).map(g => {
      const b = ageInvoices(g.invoices)
      return { name: g.name, ...b }
    })
    setRows(result.sort((a, b) => b.total - a.total))
    setLoading(false)
  }, [])

  useEffect(() => { load() }, [load])

  const tot = rows.reduce(
    (a, b) => ({ current: a.current + b.current, d30: a.d30 + b.d30, d60: a.d60 + b.d60, d90: a.d90 + b.d90, total: a.total + b.total }),
    { current: 0, d30: 0, d60: 0, d90: 0, total: 0 }
  )

  return (
    <div className="p-5 max-w-4xl">
      <div className="mb-4">
        <Link href="/customers/reports" className="text-xs text-accent hover:underline">← Reports</Link>
        <h1 className="text-xl font-semibold mt-1">Age Analysis</h1>
        <p className="text-xs mt-0.5 text-ink-2">Outstanding AR per customer · aged by due date</p>
      </div>

      <div className="card overflow-hidden">
        <table className="w-full text-xs">
          <thead className="t-head">
            <tr>
              <th className="text-left">Customer</th>
              <th className="num">Current</th>
              <th className="num">30 days</th>
              <th className="num">60 days</th>
              <th className="num">90+ days</th>
              <th className="num">Total</th>
            </tr>
          </thead>
          <tbody>
            {loading
              ? [...Array(6)].map((_, i) => (
                  <tr key={i} className="t-row">
                    {[...Array(6)].map((_, j) => (
                      <td key={j} className="t-cell"><div className="h-3 rounded animate-pulse bg-paper-edge" /></td>
                    ))}
                  </tr>
                ))
              : rows.map((r, i) => (
                  <tr key={i} className="t-row">
                    <td className="t-cell font-medium">{r.name}</td>
                    <td className="t-cell num">{cell(r.current)}</td>
                    <td className="t-cell num" style={{ color: r.d30 > 0 ? 'var(--accent)' : undefined }}>{cell(r.d30)}</td>
                    <td className="t-cell num" style={{ color: r.d60 > 0 ? 'var(--accent)' : undefined }}>{cell(r.d60)}</td>
                    <td className="t-cell num" style={{ color: r.d90 > 0 ? 'var(--negative)' : undefined }}>{cell(r.d90)}</td>
                    <td className="t-cell num font-semibold">{money(r.total)}</td>
                  </tr>
                ))}
            {!loading && rows.length === 0 && (
              <tr className="t-empty"><td colSpan={6}>No outstanding invoices</td></tr>
            )}
            {!loading && rows.length > 0 && (
              <tr style={{ borderTop: '2px solid var(--paper-edge)' }}>
                <td className="t-cell font-semibold">Total</td>
                <td className="t-cell num font-semibold">{money(tot.current)}</td>
                <td className="t-cell num font-semibold">{money(tot.d30)}</td>
                <td className="t-cell num font-semibold">{money(tot.d60)}</td>
                <td className="t-cell num font-semibold">{money(tot.d90)}</td>
                <td className="t-cell num font-bold">{money(tot.total)}</td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  )
}
