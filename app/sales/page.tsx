'use client'
import { useEffect, useState } from 'react'
import Link from 'next/link'
import { supabase } from '@/lib/supabase'
import { formatMoney, formatDate } from '@/lib/utils'
import type { Invoice } from '@/lib/types'
import Button from '@/components/ui/Button'
import Badge from '@/components/ui/Badge'

const STATUS_TABS = ['All', 'Draft', 'Sent', 'Paid', 'Overdue']

export default function SalesPage() {
  const [invoices, setInvoices] = useState<Invoice[]>([])
  const [filter, setFilter] = useState('All')
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    supabase
      .from('acct_invoices')
      .select('*, contact:acct_contacts(name, vat_number)')
      .order('created_at', { ascending: false })
      .then(({ data }) => {
        if (data) setInvoices(data as Invoice[])
        setLoading(false)
      })
  }, [])

  const displayed = filter === 'All' ? invoices : invoices.filter(i => i.status === filter.toLowerCase())

  const outstanding = invoices.filter(i => ['sent', 'overdue'].includes(i.status)).reduce((s, i) => s + Number(i.total), 0)
  const overdue = invoices.filter(i => i.status === 'overdue').reduce((s, i) => s + Number(i.total), 0)
  const paid30d = invoices.filter(i => i.status === 'paid').reduce((s, i) => s + Number(i.total), 0)

  const countOf = (s: string) => invoices.filter(i => i.status === s.toLowerCase()).length

  return (
    <div className="p-5 max-w-5xl">
      <div className="flex items-start justify-between mb-4">
        <div>
          <h1 className="text-xl font-semibold">Sales · Invoices</h1>
          <p className="text-xs mt-0.5" style={{ color: 'var(--ink-2)' }}>
            List → status · {invoices.filter(i => i.status === 'overdue').length} overdue ·{' '}
            {invoices.filter(i => i.status === 'draft').length} draft
          </p>
        </div>
        <div className="flex gap-2">
          <Button variant="secondary" size="sm">⌘ Quote</Button>
          <Button size="sm" as={Link} href="/sales/new">+ New invoice</Button>
        </div>
      </div>

      {/* Status filter tabs */}
      <div className="flex gap-1.5 mb-4">
        {STATUS_TABS.map(tab => {
          const count = tab === 'All' ? invoices.length : countOf(tab)
          return (
            <button
              key={tab}
              onClick={() => setFilter(tab)}
              className="px-3 py-1 text-xs rounded-full font-medium transition-colors"
              style={{
                background: filter === tab ? 'var(--ink)' : 'var(--surface)',
                color: filter === tab ? '#fff' : 'var(--ink-2)',
                border: `1px solid ${filter === tab ? 'var(--ink)' : 'var(--paper-edge)'}`,
              }}
            >
              {tab} {count > 0 && `(${count})`}
            </button>
          )
        })}
      </div>

      {/* KPI cards */}
      <div className="grid grid-cols-4 gap-3 mb-4">
        <SummaryCard label="Outstanding" value={outstanding} sub={`${invoices.filter(i => ['sent','overdue'].includes(i.status)).length} invoices`} />
        <SummaryCard label="Overdue" value={overdue} sub={`${countOf('overdue')} invoices`} accent />
        <SummaryCard label="Paid (30d)" value={paid30d} sub={`${countOf('paid')} invoices`} positive />
        <div className="rounded-lg p-3" style={{ background: 'var(--surface)', border: '1px solid var(--paper-edge)' }}>
          <div className="text-xs mb-1" style={{ color: 'var(--ink-2)' }}>Avg days to pay</div>
          <div className="font-mono text-xl font-bold">27d</div>
          <div className="text-xs mt-1" style={{ color: 'var(--ink-2)' }}>target 14d</div>
        </div>
      </div>

      {/* Table */}
      <div className="rounded-lg overflow-hidden" style={{ border: '1px solid var(--paper-edge)' }}>
        <table className="w-full text-xs">
          <thead>
            <tr style={{ background: 'var(--paper-edge)' }}>
              {['#', 'Customer', 'Date', 'Due', 'Excl.', 'VAT', 'Total', 'Status'].map(h => (
                <th
                  key={h}
                  className={`px-3 py-2 font-medium text-left ${['Excl.','VAT','Total'].includes(h) ? 'text-right' : ''}`}
                  style={{ color: 'var(--ink-2)' }}
                >
                  {h}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {loading
              ? [...Array(4)].map((_, i) => (
                  <tr key={i} style={{ borderBottom: '1px solid var(--paper-edge)' }}>
                    {[...Array(8)].map((_, j) => (
                      <td key={j} className="px-3 py-2">
                        <div className="h-3 rounded animate-pulse" style={{ background: 'var(--paper-edge)' }} />
                      </td>
                    ))}
                  </tr>
                ))
              : displayed.map(inv => (
                  <tr
                    key={inv.id}
                    style={{
                      borderBottom: '1px solid var(--paper-edge)',
                      background: inv.status === 'overdue' ? 'var(--accent-soft)' : 'var(--surface)',
                    }}
                  >
                    <td className="px-3 py-2 font-mono" style={{ color: 'var(--accent)' }}>
                      <Link href={`/sales/${inv.id}`} style={{ color: 'inherit' }}>{inv.number}</Link>
                    </td>
                    <td className="px-3 py-2">{(inv as any).contact?.name ?? '—'}</td>
                    <td className="px-3 py-2 font-mono" style={{ color: 'var(--ink-2)' }}>
                      {inv.date ? new Date(inv.date).toLocaleDateString('en-ZA', { day:'2-digit', month:'2-digit', year:'2-digit' }) : '—'}
                    </td>
                    <td className="px-3 py-2 font-mono" style={{ color: 'var(--ink-2)' }}>
                      {inv.due_date ? new Date(inv.due_date).toLocaleDateString('en-ZA', { day:'2-digit', month:'2-digit', year:'2-digit' }) : '—'}
                    </td>
                    <td className="px-3 py-2 font-mono text-right">{Number(inv.subtotal).toLocaleString('en-ZA', { minimumFractionDigits: 2 })}</td>
                    <td className="px-3 py-2 font-mono text-right" style={{ color: 'var(--ink-2)' }}>{Number(inv.vat_amount).toLocaleString('en-ZA', { minimumFractionDigits: 2 })}</td>
                    <td className="px-3 py-2 font-mono text-right font-semibold">{Number(inv.total).toLocaleString('en-ZA', { minimumFractionDigits: 2 })}</td>
                    <td className="px-3 py-2"><Badge status={inv.status} /></td>
                  </tr>
                ))}
            {!loading && displayed.length === 0 && (
              <tr>
                <td colSpan={8} className="px-3 py-8 text-center" style={{ color: 'var(--muted)' }}>
                  No invoices · <Link href="/sales/new" style={{ color: 'var(--accent)' }}>create one</Link>
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
      <p className="text-xs mt-2 text-right" style={{ color: 'var(--muted)', fontStyle: 'italic' }}>
        SARS-compliant tax invoice fields auto-populated
      </p>
    </div>
  )
}

function SummaryCard({ label, value, sub, accent, positive }: { label: string; value: number; sub: string; accent?: boolean; positive?: boolean }) {
  const color = accent ? 'var(--accent)' : positive ? 'var(--positive)' : 'var(--ink)'
  return (
    <div
      className="rounded-lg p-3"
      style={{
        background: accent ? 'var(--accent-soft)' : 'var(--surface)',
        border: `1px solid ${accent ? 'var(--accent)' : 'var(--paper-edge)'}`,
      }}
    >
      <div className="text-xs mb-1" style={{ color: 'var(--ink-2)' }}>{label}</div>
      <div className="font-mono text-xl font-bold" style={{ color }}>{formatMoney(value)}</div>
      <div className="text-xs mt-1" style={{ color: 'var(--ink-2)' }}>{sub}</div>
    </div>
  )
}
