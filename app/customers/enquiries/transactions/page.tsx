'use client'
import { useEffect, useState } from 'react'
import Link from 'next/link'
import { supabase } from '@/lib/supabase'
import Badge from '@/components/ui/Badge'
import { formatDate } from '@/lib/utils'

interface Row {
  id: string
  number: string
  date: string
  due_date: string | null
  status: string
  total: number
  contactName: string
}
interface Customer { id: string; name: string }

const money = (n: number) => n.toLocaleString('en-ZA', { minimumFractionDigits: 2 })
const STATUSES = ['all', 'draft', 'sent', 'overdue', 'paid', 'void']

export default function TransactionEnquiriesPage() {
  const [customers, setCustomers] = useState<Customer[]>([])
  const [contactId, setContactId] = useState('')
  const [from, setFrom]   = useState('')
  const [to, setTo]       = useState('')
  const [status, setStatus] = useState('all')
  const [rows, setRows]   = useState<Row[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    supabase.from('acct_contacts').select('id, name')
      .in('type', ['customer', 'both']).eq('is_active', true).order('name')
      .then(({ data }) => { if (data) setCustomers(data) })
  }, [])

  useEffect(() => { load() }, [contactId, from, to, status])

  async function load() {
    setLoading(true)
    let q = supabase
      .from('acct_invoices')
      .select('id, number, date, due_date, status, total, acct_contacts(name)')
      .eq('invoice_type', 'invoice')
      .order('date', { ascending: false })
    if (contactId) q = q.eq('contact_id', contactId)
    if (from)      q = q.gte('date', from)
    if (to)        q = q.lte('date', to)
    if (status !== 'all') q = q.eq('status', status)
    const { data } = await q
    setRows((data ?? []).map((i: any) => ({
      id: i.id, number: i.number, date: i.date, due_date: i.due_date, status: i.status,
      total: Number(i.total), contactName: i.acct_contacts?.name ?? '—',
    })))
    setLoading(false)
  }

  const total = rows.reduce((s, r) => s + r.total, 0)

  return (
    <div className="p-5 max-w-5xl">
      <div className="mb-4">
        <Link href="/customers/enquiries" className="text-xs text-accent hover:underline">← Enquiries</Link>
        <h1 className="text-xl font-semibold mt-1">Transaction Enquiries</h1>
        <p className="text-xs mt-0.5 text-ink-2">{rows.length} invoices · R {money(total)}</p>
      </div>

      <div className="flex gap-2 mb-4 flex-wrap items-end">
        <div>
          <label className="field-label">Customer</label>
          <select className="field" style={{ minWidth: 180 }} value={contactId} onChange={e => setContactId(e.target.value)}>
            <option value="">All customers</option>
            {customers.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
          </select>
        </div>
        <div>
          <label className="field-label">From</label>
          <input type="date" className="field" value={from} onChange={e => setFrom(e.target.value)} />
        </div>
        <div>
          <label className="field-label">To</label>
          <input type="date" className="field" value={to} onChange={e => setTo(e.target.value)} />
        </div>
        <div>
          <label className="field-label">Status</label>
          <select className="field" style={{ minWidth: 110 }} value={status} onChange={e => setStatus(e.target.value)}>
            {STATUSES.map(s => <option key={s} value={s}>{s}</option>)}
          </select>
        </div>
      </div>

      <div className="card overflow-hidden">
        <table className="w-full text-xs">
          <thead className="t-head">
            <tr>
              <th className="text-left">Date</th>
              <th className="text-left">Invoice</th>
              <th className="text-left">Customer</th>
              <th className="text-left">Due</th>
              <th className="text-left">Status</th>
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
              : rows.map(r => (
                  <tr key={r.id} className="t-row">
                    <td className="t-cell num text-ink-2">{formatDate(r.date)}</td>
                    <td className="t-cell num text-accent">{r.number}</td>
                    <td className="t-cell">{r.contactName}</td>
                    <td className="t-cell num text-ink-2">{r.due_date ? formatDate(r.due_date) : '—'}</td>
                    <td className="t-cell"><Badge status={r.status} /></td>
                    <td className="t-cell num font-semibold">{money(r.total)}</td>
                  </tr>
                ))}
            {!loading && rows.length === 0 && (
              <tr className="t-empty"><td colSpan={6}>No invoices match these filters</td></tr>
            )}
            {!loading && rows.length > 0 && (
              <tr style={{ borderTop: '2px solid var(--paper-edge)' }}>
                <td className="t-cell font-semibold" colSpan={5}>Total</td>
                <td className="t-cell num font-bold">{money(total)}</td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  )
}
