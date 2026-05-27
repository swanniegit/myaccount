'use client'
import { useEffect, useState } from 'react'
import Link from 'next/link'
import { supabase } from '@/lib/supabase'
import { formatDate } from '@/lib/utils'

interface Row { id: string; number: string; date: string; total: number; contactName: string }

const money = (n: number) => n.toLocaleString('en-ZA', { minimumFractionDigits: 2 })

export default function AllocationsPage() {
  const [rows, setRows]   = useState<Row[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => { load() }, [])

  async function load() {
    setLoading(true)
    const { data } = await supabase
      .from('acct_invoices')
      .select('id, number, date, total, acct_contacts(name)')
      .eq('invoice_type', 'invoice')
      .eq('status', 'paid')
      .order('date', { ascending: false })
    setRows((data ?? []).map((i: any) => ({
      id: i.id, number: i.number, date: i.date, total: Number(i.total), contactName: i.acct_contacts?.name ?? '—',
    })))
    setLoading(false)
  }

  const total = rows.reduce((s, r) => s + r.total, 0)

  return (
    <div className="p-5 max-w-4xl">
      <div className="mb-4">
        <Link href="/customers" className="text-xs text-accent hover:underline">← Customers</Link>
        <h1 className="text-xl font-semibold mt-1">Allocations</h1>
        <p className="text-xs mt-0.5 text-ink-2">{rows.length} settled invoices · R {money(total)}</p>
      </div>

      <div className="notice notice-dashed mb-3">
        Shows invoices marked paid (fully allocated). Partial payment-to-invoice allocation is not modelled yet.
      </div>

      <div className="card overflow-hidden">
        <table className="w-full text-xs">
          <thead className="t-head">
            <tr>
              <th className="text-left">Date</th>
              <th className="text-left">Customer</th>
              <th className="text-left">Invoice</th>
              <th className="num">Amount</th>
            </tr>
          </thead>
          <tbody>
            {loading
              ? [...Array(6)].map((_, i) => (
                  <tr key={i} className="t-row">
                    {[...Array(4)].map((_, j) => (
                      <td key={j} className="t-cell"><div className="h-3 rounded animate-pulse bg-paper-edge" /></td>
                    ))}
                  </tr>
                ))
              : rows.map(r => (
                  <tr key={r.id} className="t-row">
                    <td className="t-cell num text-ink-2">{formatDate(r.date)}</td>
                    <td className="t-cell font-medium">{r.contactName}</td>
                    <td className="t-cell num text-accent">{r.number}</td>
                    <td className="t-cell num font-semibold">{money(r.total)}</td>
                  </tr>
                ))}
            {!loading && rows.length === 0 && (
              <tr className="t-empty"><td colSpan={4}>No settled invoices yet</td></tr>
            )}
            {!loading && rows.length > 0 && (
              <tr style={{ borderTop: '2px solid var(--paper-edge)' }}>
                <td className="t-cell font-semibold" colSpan={3}>Total allocated</td>
                <td className="t-cell num font-bold">{money(total)}</td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  )
}
