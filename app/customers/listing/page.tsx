'use client'
import { useEffect, useState } from 'react'
import Link from 'next/link'
import { supabase } from '@/lib/supabase'
import type { Contact } from '@/lib/types'
import Button from '@/components/ui/Button'

interface CustomerRow extends Contact {
  open: number
  overdue: number
  ytd_sales: number
  last_txn: string
}

const AGING_BUCKETS = [
  { label: 'Current', days: '0' },
  { label: '1-30 days', days: '1-30' },
  { label: '31-60', days: '31-60' },
  { label: '61-90', days: '61-90' },
  { label: '90+', days: '90+' },
]

export default function CustomerListingPage() {
  const [customers, setCustomers] = useState<CustomerRow[]>([])
  const [search, setSearch] = useState('')
  const [loading, setLoading] = useState(true)
  const [showAdd, setShowAdd] = useState(false)
  const [newName, setNewName] = useState('')
  const [newVat, setNewVat] = useState('')
  const [newEmail, setNewEmail] = useState('')

  useEffect(() => {
    supabase
      .from('acct_contacts')
      .select('*')
      .in('type', ['customer', 'both'])
      .eq('is_active', true)
      .order('name')
      .then(({ data }) => {
        if (data) {
          setCustomers(data.map(c => ({
            ...c,
            open: 0,
            overdue: 0,
            ytd_sales: 0,
            last_txn: '',
          })))
        }
        setLoading(false)
      })
  }, [])

  const filtered = customers.filter(c =>
    c.name.toLowerCase().includes(search.toLowerCase())
  )

  const totalOutstanding = customers.reduce((s, c) => s + c.open, 0)

  async function addCustomer() {
    if (!newName) return
    const { data } = await supabase
      .from('acct_contacts')
      .insert({ name: newName, type: 'customer', vat_number: newVat || null, email: newEmail || null })
      .select()
      .single()
    if (data) {
      setCustomers(prev => [...prev, { ...data, open: 0, overdue: 0, ytd_sales: 0, last_txn: '' }])
      setNewName('')
      setNewVat('')
      setNewEmail('')
      setShowAdd(false)
    }
  }

  return (
    <div className="p-5 max-w-5xl">
      <div className="mb-4">
        <Link href="/customers" className="text-xs text-accent hover:underline">← Customers</Link>
        <h1 className="text-xl font-semibold mt-1">Customer Listing</h1>
        <p className="text-xs mt-0.5 text-ink-2">
          {customers.length} active · R {totalOutstanding.toLocaleString('en-ZA', { minimumFractionDigits: 0 })} outstanding total
        </p>
      </div>

      <div className="flex gap-2 mb-4">
        <div className="search-box" style={{ width: 220 }}>
          <span className="text-xs text-muted">⌕</span>
          <input
            type="text"
            placeholder="customer name"
            value={search}
            onChange={e => setSearch(e.target.value)}
          />
        </div>
        <div className="pill" data-active={true}>active</div>
        <div className="ml-auto flex gap-2">
          <Button variant="secondary" size="sm">Statements run</Button>
          <Button size="sm" onClick={() => setShowAdd(v => !v)}>+ Customer</Button>
        </div>
      </div>

      {showAdd && (
        <div className="card p-4 mb-4 flex gap-3 items-end">
          <div style={{ width: 180 }}>
            <label className="field-label">Customer name</label>
            <input type="text" value={newName} onChange={e => setNewName(e.target.value)} className="field" />
          </div>
          <div style={{ width: 130 }}>
            <label className="field-label">VAT no.</label>
            <input type="text" value={newVat} onChange={e => setNewVat(e.target.value)} className="field" />
          </div>
          <div style={{ width: 180 }}>
            <label className="field-label">Email</label>
            <input type="email" value={newEmail} onChange={e => setNewEmail(e.target.value)} className="field" />
          </div>
          <Button size="sm" onClick={addCustomer}>Save</Button>
          <Button variant="ghost" size="sm" onClick={() => setShowAdd(false)}>Cancel</Button>
        </div>
      )}

      {/* AR Aging buckets */}
      <div className="mb-4">
        <div className="text-xs font-medium mb-2">AR aging</div>
        <div className="grid grid-cols-5 gap-2">
          {AGING_BUCKETS.map((b, i) => (
            <div key={b.label} className={i === 2 ? 'card-accent p-3' : 'card p-3'}>
              <div className={`text-xs mb-1 ${i === 2 ? 'text-accent' : 'text-ink-2'}`}>{b.label}</div>
              <div className="font-mono font-bold text-sm">R —</div>
              <div className="text-xs mt-0.5 text-muted">—</div>
            </div>
          ))}
        </div>
      </div>

      <div className="card overflow-hidden">
        <table className="w-full text-xs">
          <thead className="t-head">
            <tr>
              <th className="text-left">Customer</th>
              <th className="text-left">VAT no.</th>
              <th className="text-right">Open</th>
              <th className="text-right">Overdue</th>
              <th className="text-right">YTD sales</th>
              <th className="text-left">Last txn</th>
            </tr>
          </thead>
          <tbody>
            {loading
              ? [...Array(5)].map((_, i) => (
                  <tr key={i} className="t-row">
                    {[...Array(6)].map((_, j) => (
                      <td key={j} className="t-cell">
                        <div className="h-3 rounded animate-pulse bg-paper-edge" />
                      </td>
                    ))}
                  </tr>
                ))
              : filtered.map(c => (
                  <tr
                    key={c.id}
                    className="t-row cursor-pointer hover:opacity-80"
                    style={{ background: c.overdue > 0 ? 'var(--accent-soft)' : 'var(--surface)' }}
                  >
                    <td className="t-cell font-medium">{c.name}</td>
                    <td className="t-cell num text-ink-2">{c.vat_number ?? '—'}</td>
                    <td className="t-cell num">{c.open > 0 ? c.open.toLocaleString('en-ZA', { minimumFractionDigits: 2 }) : '—'}</td>
                    <td className="t-cell num" style={{ color: c.overdue > 0 ? 'var(--accent)' : undefined }}>
                      {c.overdue > 0 ? c.overdue.toLocaleString('en-ZA', { minimumFractionDigits: 2 }) : '—'}
                    </td>
                    <td className="t-cell num">{c.ytd_sales > 0 ? c.ytd_sales.toLocaleString('en-ZA', { minimumFractionDigits: 2 }) : '—'}</td>
                    <td className="t-cell num text-ink-2">{c.last_txn || '—'}</td>
                  </tr>
                ))}
            {!loading && filtered.length === 0 && (
              <tr className="t-empty"><td colSpan={6}>No customers yet</td></tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  )
}
