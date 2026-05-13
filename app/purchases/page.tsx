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

const STATUS_TABS = ['All', 'Awaiting approval', 'Approved', 'Paid']
const TAB_STATUS: Record<string, string> = {
  'Awaiting approval': 'draft',
  'Approved':          'sent',
  'Paid':              'paid',
}

export default function PurchasesPage() {
  const [bills, setBills]         = useState<Invoice[]>([])
  const [filter, setFilter]       = useState('All')
  const [period, setPeriod]       = useState<MonthValue>(currentMonth())
  const [loading, setLoading]     = useState(true)
  const [selected, setSelected]   = useState<Invoice | null>(null)
  const [sheetOpen, setSheetOpen] = useState(false)

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

  useEffect(() => { setSelected(null); load() }, [load])

  const displayed     = filter === 'All' ? bills : bills.filter(b => b.status === TAB_STATUS[filter])
  const countOf       = (tab: string) => tab === 'All' ? bills.length : bills.filter(b => b.status === TAB_STATUS[tab]).length
  const payable       = bills.filter(b => ['draft', 'sent'].includes(b.status))
  const awaitingCount = bills.filter(b => b.status === 'draft').length

  function handleBillUpdated(updated: Invoice) {
    setBills(prev => prev.map(b => b.id === updated.id ? updated : b))
    setSelected(updated)
  }

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
          <MonthPicker value={period} onChange={p => { setPeriod(p); setFilter('All') }} />
          <Button size="sm" onClick={() => setSheetOpen(true)}>+ New bill</Button>
        </div>
      </div>

      <div className="grid grid-cols-3 gap-3">
        <KpiCard label="Total payable"     value={payable.reduce((s,b) => s + Number(b.total), 0)} sub={`${payable.length} bills`} />
        <KpiCard label="Awaiting approval" value={bills.filter(b => b.status === 'draft').reduce((s,b) => s + Number(b.total), 0)} sub={`${awaitingCount} bills`} accent={awaitingCount > 0} />
        <KpiCard label="Paid this period"  value={bills.filter(b => b.status === 'paid').reduce((s,b) => s + Number(b.total), 0)} sub={`${bills.filter(b => b.status === 'paid').length} bills`} positive />
      </div>

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
                  : displayed.map(bill => (
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
                        <td className="t-cell t-secondary">
                          {bill.due_date ? new Date(bill.due_date).toLocaleDateString('en-ZA', { day: '2-digit', month: '2-digit', year: '2-digit' }) : '—'}
                        </td>
                        <td className="t-cell num">{Number(bill.subtotal).toLocaleString('en-ZA', { minimumFractionDigits: 2 })}</td>
                        <td className="t-cell num t-secondary">
                          {Number(bill.vat_amount) > 0 ? Number(bill.vat_amount).toLocaleString('en-ZA', { minimumFractionDigits: 2 }) : '—'}
                        </td>
                        <td className="t-cell num font-semibold">{Number(bill.total).toLocaleString('en-ZA', { minimumFractionDigits: 2 })}</td>
                        <td className="t-cell"><Badge status={bill.status} /></td>
                      </tr>
                    ))}
                {!loading && displayed.length === 0 && (
                  <tr className="t-empty"><td colSpan={8}>No bills this period</td></tr>
                )}
              </tbody>
            </table>
          </div>
        </div>

        {selected && <BillDetail bill={selected} onUpdated={handleBillUpdated} />}
      </div>

      <NewBillSheet open={sheetOpen} onClose={() => setSheetOpen(false)} onCreated={load} />
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
