'use client'
import { useCallback, useEffect, useState } from 'react'
import { supabase } from '@/lib/supabase'
import { formatMoney } from '@/lib/utils'
import type { Invoice } from '@/lib/types'
import Button from '@/components/ui/Button'
import Badge from '@/components/ui/Badge'
import MonthPicker, { currentMonth, monthRange, type MonthValue } from '@/components/ui/MonthPicker'
import NewBillSheet from '@/components/purchases/NewBillSheet'
import BillDetail from '@/components/purchases/BillDetail'
import Link from 'next/link'

const STATUS_TABS = ['All', 'Awaiting approval', 'Approved', 'Overdue', 'Paid']
const TAB_STATUS: Record<string, string> = {
  'Awaiting approval': 'draft',
  'Approved':          'sent',
  'Paid':              'paid',
}

const todayStr = new Date().toISOString().slice(0, 10)

function isOverdue(b: Invoice) {
  return b.status === 'sent' && !!b.due_date && b.due_date < todayStr
}

function daysPast(dueDate: string): number {
  return Math.floor((Date.now() - new Date(dueDate).getTime()) / 86_400_000)
}

export default function PurchasesPage() {
  const [bills, setBills]             = useState<Invoice[]>([])
  const [allUnpaid, setAllUnpaid]     = useState<Invoice[]>([])
  const [filter, setFilter]           = useState('All')
  const [period, setPeriod]           = useState<MonthValue>(currentMonth())
  const [loading, setLoading]         = useState(true)
  const [selected, setSelected]       = useState<Invoice | null>(null)
  const [sheetOpen, setSheetOpen]     = useState(false)

  const { start, end } = monthRange(period)

  const load = useCallback(() => {
    setLoading(true)
    supabase
      .from('acct_invoices')
      .select('*, contact:acct_contacts(name)')
      .eq('invoice_type', 'bill')
      .gte('date', start)
      .lt('date', end)
      .order('date', { ascending: false })
      .limit(2000)
      .then(({ data }) => {
        if (data) setBills(data as Invoice[])
        setLoading(false)
      })
  }, [start, end])

  // Separate all-time unpaid query for AP aging (not filtered by period)
  function loadAllUnpaid() {
    supabase
      .from('acct_invoices')
      .select('total, status, due_date')
      .eq('invoice_type', 'bill')
      .in('status', ['draft', 'sent'])
      .then(({ data }) => { if (data) setAllUnpaid(data as Invoice[]) })
  }

  useEffect(() => { setSelected(null); load(); loadAllUnpaid() }, [load])

  function handleBillUpdated(updated: Invoice) {
    setBills(prev => prev.map(b => b.id === updated.id ? updated : b))
    setSelected(updated)
    loadAllUnpaid()
  }

  const displayed = filter === 'All'  ? bills
    : filter === 'Overdue'            ? bills.filter(isOverdue)
    : bills.filter(b => b.status === TAB_STATUS[filter])

  function countOf(tab: string) {
    if (tab === 'All')     return bills.length
    if (tab === 'Overdue') return bills.filter(isOverdue).length
    return bills.filter(b => b.status === TAB_STATUS[tab]).length
  }

  // KPI totals (period-filtered)
  const payable       = bills.filter(b => ['draft', 'sent'].includes(b.status))
  const awaitingCount = bills.filter(b => b.status === 'draft').length

  // AP Aging (all-time unpaid)
  const aging = (() => {
    const unpaid = allUnpaid
    const current  = unpaid.filter(b => !b.due_date || b.due_date >= todayStr)
    const d1_30    = unpaid.filter(b => b.due_date && b.due_date < todayStr && daysPast(b.due_date) <= 30)
    const d31_60   = unpaid.filter(b => b.due_date && daysPast(b.due_date) > 30 && daysPast(b.due_date) <= 60)
    const d61plus  = unpaid.filter(b => b.due_date && daysPast(b.due_date) > 60)
    return { current, d1_30, d31_60, d61plus }
  })()

  const agingTotal = allUnpaid.reduce((s, b) => s + Number(b.total), 0)

  return (
    <div className="p-5 flex flex-col gap-4">
      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-xl font-semibold">Purchases · Bills</h1>
          <p className="text-xs mt-0.5 t-secondary">
            {awaitingCount > 0 ? `${awaitingCount} awaiting approval · ` : ''}What I owe
          </p>
        </div>
        <div className="flex gap-2 items-center">
          <Link href="/suppliers" className="btn btn-ghost text-xs no-underline">Suppliers →</Link>
          <MonthPicker value={period} onChange={p => { setPeriod(p); setFilter('All') }} />
          <Button size="sm" onClick={() => setSheetOpen(true)}>+ New bill</Button>
        </div>
      </div>

      {/* KPI row */}
      <div className="grid grid-cols-3 gap-3">
        <KpiCard label="Total payable"     value={payable.reduce((s, b) => s + Number(b.total), 0)} sub={`${payable.length} bills · this period`} />
        <KpiCard label="Awaiting approval" value={bills.filter(b => b.status === 'draft').reduce((s, b) => s + Number(b.total), 0)} sub={`${awaitingCount} bills`} accent={awaitingCount > 0} />
        <KpiCard label="Paid this period"  value={bills.filter(b => b.status === 'paid').reduce((s, b) => s + Number(b.total), 0)} sub={`${bills.filter(b => b.status === 'paid').length} bills`} positive />
      </div>

      {/* AP Aging (all-time) */}
      {agingTotal > 0 && (
        <div className="card p-3">
          <div className="flex items-baseline justify-between mb-2">
            <span className="text-xs font-medium">AP aging · all outstanding</span>
            <span className="text-xs t-secondary num">{formatMoney(agingTotal)} total</span>
          </div>
          <div className="grid grid-cols-4 gap-2 text-xs">
            {[
              { label: 'Current',    bills: aging.current, warn: false },
              { label: '1–30 days',  bills: aging.d1_30,   warn: true  },
              { label: '31–60 days', bills: aging.d31_60,  warn: true  },
              { label: '61+ days',   bills: aging.d61plus, warn: true  },
            ].map(({ label, bills: bs, warn }) => (
              <div
                key={label}
                className="rounded p-2"
                style={{
                  background: warn && bs.length > 0 ? 'rgba(192,57,43,0.07)' : 'var(--surface)',
                  border: `1px solid ${warn && bs.length > 0 ? 'rgba(192,57,43,0.25)' : 'var(--paper-edge)'}`,
                }}
              >
                <div className="t-secondary mb-0.5">{label}</div>
                <div
                  className="num font-semibold"
                  style={{ color: warn && bs.length > 0 ? 'var(--negative)' : 'var(--ink)' }}
                >
                  {formatMoney(bs.reduce((s, b) => s + Number(b.total), 0))}
                </div>
                <div className="t-secondary mt-0.5">{bs.length} bill{bs.length !== 1 ? 's' : ''}</div>
              </div>
            ))}
          </div>
        </div>
      )}

      <div className="flex gap-4">
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-1.5 mb-3">
            {STATUS_TABS.map(tab => (
              <button key={tab} className="pill" data-active={filter === tab} onClick={() => setFilter(tab)}>
                {tab} {countOf(tab) > 0 && `(${countOf(tab)})`}
              </button>
            ))}
          </div>

          <div className="card overflow-hidden">
            <table className="w-full">
              <thead className="t-head">
                <tr>
                  <th>Ref</th>
                  <th>Supplier</th>
                  <th>Date</th>
                  <th>Due</th>
                  <th className="num">Excl.</th>
                  <th className="num">VAT</th>
                  <th className="num">Total</th>
                  <th>Status</th>
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
                  : displayed.map(bill => {
                      const overdue = isOverdue(bill)
                      return (
                        <tr
                          key={bill.id}
                          className="t-row t-row-clickable"
                          data-selected={selected?.id === bill.id}
                          data-warning={bill.status === 'draft' && selected?.id !== bill.id}
                          onClick={() => setSelected(selected?.id === bill.id ? null : bill)}
                        >
                          <td className="t-cell t-cell-accent">{bill.number}</td>
                          <td className="t-cell">{(bill as any).contact?.name ?? '—'}</td>
                          <td className="t-cell t-secondary">
                            {bill.date ? new Date(bill.date).toLocaleDateString('en-ZA', { day: '2-digit', month: '2-digit', year: '2-digit' }) : '—'}
                          </td>
                          <td className="t-cell" style={{ color: overdue ? 'var(--negative)' : undefined }}>
                            {bill.due_date
                              ? new Date(bill.due_date).toLocaleDateString('en-ZA', { day: '2-digit', month: '2-digit', year: '2-digit' })
                              : <span className="t-secondary">—</span>}
                            {overdue && ' ⚠'}
                          </td>
                          <td className="t-cell num">{Number(bill.subtotal).toLocaleString('en-ZA', { minimumFractionDigits: 2 })}</td>
                          <td className="t-cell num t-secondary">
                            {Number(bill.vat_amount) > 0 ? Number(bill.vat_amount).toLocaleString('en-ZA', { minimumFractionDigits: 2 }) : '—'}
                          </td>
                          <td className="t-cell num font-semibold">{Number(bill.total).toLocaleString('en-ZA', { minimumFractionDigits: 2 })}</td>
                          <td className="t-cell"><Badge status={overdue ? 'overdue' : bill.status} /></td>
                        </tr>
                      )
                    })}
                {!loading && displayed.length === 0 && (
                  <tr className="t-empty"><td colSpan={8}>No bills this period</td></tr>
                )}
              </tbody>
            </table>
          </div>
        </div>

        {selected && <BillDetail bill={selected} onUpdated={handleBillUpdated} />}
      </div>

      <NewBillSheet open={sheetOpen} onClose={() => setSheetOpen(false)} onCreated={() => { load(); loadAllUnpaid() }} />
    </div>
  )
}

function KpiCard({ label, value, sub, accent, positive }: {
  label: string; value: number; sub: string; accent?: boolean; positive?: boolean
}) {
  const color = accent ? 'var(--accent)' : positive ? 'var(--positive)' : 'var(--ink)'
  return (
    <div className={accent ? 'card-accent kpi' : 'card kpi'}>
      <p className="kpi-label">{label}</p>
      <p className="kpi-value" style={{ color }}>{formatMoney(value)}</p>
      <p className="kpi-sub">{sub}</p>
    </div>
  )
}
