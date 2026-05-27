'use client'
import { useCallback, useEffect, useState } from 'react'
import Link from 'next/link'
import { supabase } from '@/lib/supabase'
import { ageInvoices, type AgeableInvoice } from '@/lib/ar/aging'

interface Row {
  id: string
  name: string
  current: number
  d30: number
  d60: number
  d90: number
  total: number
}

const money = (n: number) => n.toLocaleString('en-ZA', { minimumFractionDigits: 2 })
const cell = (n: number) => n > 0 ? money(n) : '–'

export default function StatementRunPage() {
  const [rows, setRows]   = useState<Row[]>([])
  const [loading, setLoading] = useState(true)

  const load = useCallback(async () => {
    setLoading(true)
    const { data } = await supabase
      .from('acct_invoices')
      .select('total, due_date, date, contact_id, acct_contacts(name)')
      .eq('invoice_type', 'invoice')
      .in('status', ['sent', 'overdue'])

    const byCustomer = new Map<string, { id: string; name: string; invoices: AgeableInvoice[] }>()
    for (const i of (data ?? []) as any[]) {
      if (!i.contact_id) continue
      const g: { id: string; name: string; invoices: AgeableInvoice[] } = byCustomer.get(i.contact_id) ?? { id: i.contact_id, name: i.acct_contacts?.name ?? '—', invoices: [] }
      g.invoices.push({ total: i.total, due_date: i.due_date, date: i.date })
      byCustomer.set(i.contact_id, g)
    }

    const result: Row[] = Array.from(byCustomer.values())
      .map(g => ({ id: g.id, name: g.name, ...ageInvoices(g.invoices) }))
      .filter(r => r.total > 0)
      .sort((a, b) => b.total - a.total)
    setRows(result)
    setLoading(false)
  }, [])

  useEffect(() => { load() }, [load])

  const grand = rows.reduce((s, r) => s + r.total, 0)

  return (
    <div className="p-5 max-w-4xl">
      <div className="mb-4">
        <Link href="/customers" className="text-xs text-accent hover:underline">← Customers</Link>
        <h1 className="text-xl font-semibold mt-1">Statement Run</h1>
        <p className="text-xs mt-0.5 text-ink-2">{rows.length} customers with an open balance · R {money(grand)} to be statemented</p>
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
              <th className="num">Outstanding</th>
              <th />
            </tr>
          </thead>
          <tbody>
            {loading
              ? [...Array(6)].map((_, i) => (
                  <tr key={i} className="t-row">
                    {[...Array(7)].map((_, j) => (
                      <td key={j} className="t-cell"><div className="h-3 rounded animate-pulse bg-paper-edge" /></td>
                    ))}
                  </tr>
                ))
              : rows.map(r => (
                  <tr key={r.id} className="t-row">
                    <td className="t-cell font-medium">{r.name}</td>
                    <td className="t-cell num">{cell(r.current)}</td>
                    <td className="t-cell num" style={{ color: r.d30 > 0 ? 'var(--accent)' : undefined }}>{cell(r.d30)}</td>
                    <td className="t-cell num" style={{ color: r.d60 > 0 ? 'var(--accent)' : undefined }}>{cell(r.d60)}</td>
                    <td className="t-cell num" style={{ color: r.d90 > 0 ? 'var(--negative)' : undefined }}>{cell(r.d90)}</td>
                    <td className="t-cell num font-semibold">{money(r.total)}</td>
                    <td className="t-cell">
                      <Link href={`/customers/reports/statements?customer=${r.id}`} className="text-accent hover:underline">Statement →</Link>
                    </td>
                  </tr>
                ))}
            {!loading && rows.length === 0 && (
              <tr className="t-empty"><td colSpan={7}>No customers with an open balance</td></tr>
            )}
            {!loading && rows.length > 0 && (
              <tr style={{ borderTop: '2px solid var(--paper-edge)' }}>
                <td className="t-cell font-semibold" colSpan={5}>Total outstanding</td>
                <td className="t-cell num font-bold">{money(grand)}</td>
                <td />
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  )
}
