'use client'
import { useEffect, useState } from 'react'
import Link from 'next/link'
import { supabase } from '@/lib/supabase'
import { formatMoney } from '@/lib/utils'
import type { Invoice } from '@/lib/types'
import Button from '@/components/ui/Button'
import Badge from '@/components/ui/Badge'
import MonthPicker, { currentMonth, monthRange, type MonthValue } from '@/components/ui/MonthPicker'

const STATUS_TABS = ['All', 'Draft', 'Sent', 'Paid', 'Overdue']

export default function SalesPage() {
  const [invoices, setInvoices] = useState<Invoice[]>([])
  const [filter, setFilter]     = useState('All')
  const [period, setPeriod]     = useState<MonthValue>(currentMonth())
  const [loading, setLoading]   = useState(true)

  const { start, end } = monthRange(period)

  useEffect(() => {
    setLoading(true)
    supabase
      .from('acct_invoices')
      .select('*, contact:acct_contacts(name, vat_number)')
      .eq('invoice_type', 'invoice')
      .gte('date', start)
      .lt('date', end)
      .order('date', { ascending: false })
      .limit(2000)
      .then(({ data }) => {
        if (data) setInvoices(data as Invoice[])
        setLoading(false)
      })
  }, [start, end])

  const displayed  = filter === 'All' ? invoices : invoices.filter(i => i.status === filter.toLowerCase())
  const countOf    = (s: string) => invoices.filter(i => i.status === s.toLowerCase()).length
  const outstanding = invoices.filter(i => ['sent','overdue'].includes(i.status)).reduce((s,i) => s + Number(i.total), 0)
  const overdue     = invoices.filter(i => i.status === 'overdue').reduce((s,i) => s + Number(i.total), 0)
  const paid        = invoices.filter(i => i.status === 'paid').reduce((s,i) => s + Number(i.total), 0)

  return (
    <div className="p-5 max-w-5xl">
      <div className="flex items-start justify-between mb-4">
        <div>
          <h1 className="text-xl font-semibold">Sales · Invoices</h1>
          <p className="text-xs mt-0.5 text-ink-2">
            {countOf('overdue')} overdue · {countOf('draft')} draft
          </p>
        </div>
        <div className="flex gap-2 items-center">
          <MonthPicker value={period} onChange={p => { setPeriod(p); setFilter('All') }} />
          <Button variant="secondary" size="sm">⌘ Quote</Button>
          <Button size="sm" as={Link} href="/sales/new">+ New invoice</Button>
        </div>
      </div>

      <div className="flex gap-1.5 mb-4">
        {STATUS_TABS.map(tab => {
          const count = tab === 'All' ? invoices.length : countOf(tab)
          return (
            <button key={tab} className="pill" data-active={filter === tab} onClick={() => setFilter(tab)}>
              {tab} {count > 0 && `(${count})`}
            </button>
          )
        })}
      </div>

      <div className="grid grid-cols-4 gap-3 mb-4">
        <KpiCard label="Outstanding" value={outstanding} sub={`${invoices.filter(i => ['sent','overdue'].includes(i.status)).length} invoices`} />
        <KpiCard label="Overdue"     value={overdue}     sub={`${countOf('overdue')} invoices`} accent />
        <KpiCard label="Paid"        value={paid}        sub={`${countOf('paid')} invoices`}    positive />
        <div className="card kpi">
          <p className="kpi-label">Avg days to pay</p>
          <p className="kpi-value">27d</p>
          <p className="kpi-sub">target 14d</p>
        </div>
      </div>

      <div className="card overflow-hidden">
        <table className="w-full">
          <thead className="t-head">
            <tr>
              <th>#</th><th>Customer</th><th>Date</th><th>Due</th>
              <th className="num">Excl.</th><th className="num">VAT</th>
              <th className="num">Total</th><th>Status</th>
            </tr>
          </thead>
          <tbody>
            {loading
              ? [...Array(4)].map((_, i) => (
                  <tr key={i} className="t-row">
                    {[...Array(8)].map((_, j) => (
                      <td key={j} className="t-cell">
                        <div className="h-3 rounded animate-pulse bg-paper-edge" />
                      </td>
                    ))}
                  </tr>
                ))
              : displayed.map(inv => (
                  <tr key={inv.id} className="t-row" data-warning={inv.status === 'overdue'}>
                    <td className="t-cell t-cell-accent">
                      <Link href={`/sales/${inv.id}`} className="t-accent">{inv.number}</Link>
                    </td>
                    <td className="t-cell">{(inv as any).contact?.name ?? '—'}</td>
                    <td className="t-cell t-secondary num">
                      {inv.date ? new Date(inv.date).toLocaleDateString('en-ZA', { day:'2-digit', month:'2-digit', year:'2-digit' }) : '—'}
                    </td>
                    <td className="t-cell t-secondary num">
                      {inv.due_date ? new Date(inv.due_date).toLocaleDateString('en-ZA', { day:'2-digit', month:'2-digit', year:'2-digit' }) : '—'}
                    </td>
                    <td className="t-cell num">{Number(inv.subtotal).toLocaleString('en-ZA', { minimumFractionDigits: 2 })}</td>
                    <td className="t-cell num t-secondary">{Number(inv.vat_amount).toLocaleString('en-ZA', { minimumFractionDigits: 2 })}</td>
                    <td className="t-cell num font-semibold">{Number(inv.total).toLocaleString('en-ZA', { minimumFractionDigits: 2 })}</td>
                    <td className="t-cell"><Badge status={inv.status} /></td>
                  </tr>
                ))}
            {!loading && displayed.length === 0 && (
              <tr className="t-empty">
                <td colSpan={8}>No invoices this period · <Link href="/sales/new" className="t-accent">create one</Link></td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
      <p className="text-xs mt-2 text-right text-muted italic">SARS-compliant tax invoice fields auto-populated</p>
    </div>
  )
}

function KpiCard({ label, value, sub, accent, positive }: { label: string; value: number; sub: string; accent?: boolean; positive?: boolean }) {
  const color = accent ? 'var(--accent)' : positive ? 'var(--positive)' : 'var(--ink)'
  return (
    <div className={accent ? 'card-accent kpi' : 'card kpi'}>
      <p className="kpi-label">{label}</p>
      <p className="kpi-value" style={{ color }}>{formatMoney(value)}</p>
      <p className="kpi-sub">{sub}</p>
    </div>
  )
}
