'use client'
import { Suspense, useEffect, useState } from 'react'
import Link from 'next/link'
import { useSearchParams } from 'next/navigation'
import { supabase } from '@/lib/supabase'
import Badge from '@/components/ui/Badge'
import { formatDate } from '@/lib/utils'
import { ageInvoices, type AgeableInvoice } from '@/lib/ar/aging'

interface Customer { id: string; name: string; email: string | null; vat_number: string | null }
interface Inv { id: string; number: string; date: string; due_date: string | null; status: string; total: number }

const money = (n: number) => n.toLocaleString('en-ZA', { minimumFractionDigits: 2 })

function StatementsInner() {
  const initial = useSearchParams().get('customer') ?? ''
  const [customers, setCustomers] = useState<Customer[]>([])
  const [contactId, setContactId] = useState(initial)
  const [invoices, setInvoices]   = useState<Inv[]>([])
  const [loading, setLoading]     = useState(false)

  useEffect(() => {
    supabase.from('acct_contacts').select('id, name, email, vat_number')
      .in('type', ['customer', 'both']).eq('is_active', true).order('name')
      .then(({ data }) => { if (data) setCustomers(data) })
  }, [])

  useEffect(() => {
    if (!contactId) { setInvoices([]); return }
    setLoading(true)
    supabase.from('acct_invoices')
      .select('id, number, date, due_date, status, total')
      .eq('invoice_type', 'invoice').eq('contact_id', contactId)
      .in('status', ['sent', 'overdue', 'paid'])
      .order('date', { ascending: true })
      .then(({ data }) => {
        setInvoices((data ?? []).map((i: any) => ({
          id: i.id, number: i.number, date: i.date, due_date: i.due_date, status: i.status, total: Number(i.total),
        })))
        setLoading(false)
      })
  }, [contactId])

  const customer = customers.find(c => c.id === contactId)
  const openInv: AgeableInvoice[] = invoices
    .filter(i => i.status === 'sent' || i.status === 'overdue')
    .map(i => ({ total: i.total, due_date: i.due_date, date: i.date }))
  const aging = ageInvoices(openInv)

  return (
    <div className="p-5 max-w-3xl">
      <div className="mb-4 flex items-end justify-between">
        <div>
          <Link href="/customers/reports" className="text-xs text-accent hover:underline">← Reports</Link>
          <h1 className="text-xl font-semibold mt-1">Statements</h1>
          <p className="text-xs mt-0.5 text-ink-2">Single-customer statement</p>
        </div>
        <div className="flex gap-2 items-end">
          <div>
            <label className="field-label">Customer</label>
            <select className="field" style={{ minWidth: 200 }} value={contactId} onChange={e => setContactId(e.target.value)}>
              <option value="">Select customer…</option>
              {customers.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
            </select>
          </div>
          {contactId && <button className="btn btn-sm btn-secondary" onClick={() => window.print()}>Print</button>}
        </div>
      </div>

      {!contactId ? (
        <div className="card p-8 text-center text-xs text-muted">Select a customer to view their statement</div>
      ) : (
        <div className="card p-5">
          <div className="mb-4">
            <p className="text-base font-semibold">{customer?.name}</p>
            {customer?.email && <p className="text-xs text-ink-2">{customer.email}</p>}
            {customer?.vat_number && <p className="text-xs text-ink-2">VAT {customer.vat_number}</p>}
          </div>

          <table className="w-full text-xs mb-4">
            <thead className="t-head">
              <tr>
                <th className="text-left">Date</th>
                <th className="text-left">Invoice</th>
                <th className="text-left">Due</th>
                <th className="text-left">Status</th>
                <th className="num">Amount</th>
              </tr>
            </thead>
            <tbody>
              {loading
                ? <tr className="t-row"><td className="t-cell text-ink-2" colSpan={5}>Loading…</td></tr>
                : invoices.length === 0
                  ? <tr className="t-empty"><td colSpan={5}>No invoices for this customer</td></tr>
                  : invoices.map(i => (
                      <tr key={i.id} className="t-row">
                        <td className="t-cell num text-ink-2">{formatDate(i.date)}</td>
                        <td className="t-cell num text-accent">{i.number}</td>
                        <td className="t-cell num text-ink-2">{i.due_date ? formatDate(i.due_date) : '—'}</td>
                        <td className="t-cell"><Badge status={i.status} /></td>
                        <td className="t-cell num">{money(i.total)}</td>
                      </tr>
                    ))}
            </tbody>
          </table>

          <div className="flex justify-end">
            <div className="w-64 text-xs space-y-1">
              <SumRow label="Current"  v={aging.current} />
              <SumRow label="30 days"  v={aging.d30} />
              <SumRow label="60 days"  v={aging.d60} />
              <SumRow label="90+ days" v={aging.d90} />
              <div style={{ borderTop: '1px solid var(--paper-edge)', paddingTop: 4, marginTop: 4 }}>
                <SumRow label="Balance due" v={aging.total} bold />
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

function SumRow({ label, v, bold }: { label: string; v: number; bold?: boolean }) {
  return (
    <div className="flex justify-between" style={{ fontWeight: bold ? 700 : undefined }}>
      <span className={bold ? '' : 'text-ink-2'}>{label}</span>
      <span className="num">{v.toLocaleString('en-ZA', { minimumFractionDigits: 2 })}</span>
    </div>
  )
}

export default function StatementsPage() {
  return (
    <Suspense fallback={<div className="p-5 text-sm text-ink-2">Loading…</div>}>
      <StatementsInner />
    </Suspense>
  )
}
