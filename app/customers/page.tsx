'use client'
import { useEffect, useState } from 'react'
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

export default function CustomersPage() {
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
        <h1 className="text-xl font-semibold">Customers</h1>
        <p className="text-xs mt-0.5" style={{ color: 'var(--ink-2)' }}>
          {customers.length} active · R {totalOutstanding.toLocaleString('en-ZA', { minimumFractionDigits: 0 })} outstanding total
        </p>
      </div>

      {/* Filters + actions */}
      <div className="flex gap-2 mb-4">
        <div
          className="flex items-center gap-2 px-3 py-1.5 rounded"
          style={{ border: '1px solid var(--paper-edge)', background: 'var(--surface)', width: 220 }}
        >
          <span className="text-xs" style={{ color: 'var(--muted)' }}>⌕</span>
          <input
            type="text"
            placeholder="customer name"
            value={search}
            onChange={e => setSearch(e.target.value)}
            className="flex-1 outline-none bg-transparent text-xs"
          />
        </div>
        <div
          className="px-3 py-1.5 rounded text-xs"
          style={{ border: '1px solid var(--paper-edge)', background: 'var(--surface)', color: 'var(--ink-2)' }}
        >
          active
        </div>
        <div className="ml-auto flex gap-2">
          <Button variant="secondary" size="sm">Statements run</Button>
          <Button size="sm" onClick={() => setShowAdd(v => !v)}>+ Customer</Button>
        </div>
      </div>

      {/* Add form */}
      {showAdd && (
        <div
          className="rounded-lg p-4 mb-4 flex gap-3 items-end"
          style={{ background: 'var(--surface)', border: '1px solid var(--paper-edge)' }}
        >
          <div>
            <label className="text-xs block mb-1" style={{ color: 'var(--ink-2)' }}>Customer name</label>
            <input
              type="text"
              value={newName}
              onChange={e => setNewName(e.target.value)}
              className="rounded px-2 py-1.5 text-xs"
              style={{ border: '1px solid var(--paper-edge)', background: 'var(--paper)', width: 180 }}
            />
          </div>
          <div>
            <label className="text-xs block mb-1" style={{ color: 'var(--ink-2)' }}>VAT no.</label>
            <input
              type="text"
              value={newVat}
              onChange={e => setNewVat(e.target.value)}
              className="rounded px-2 py-1.5 text-xs"
              style={{ border: '1px solid var(--paper-edge)', background: 'var(--paper)', width: 130 }}
            />
          </div>
          <div>
            <label className="text-xs block mb-1" style={{ color: 'var(--ink-2)' }}>Email</label>
            <input
              type="email"
              value={newEmail}
              onChange={e => setNewEmail(e.target.value)}
              className="rounded px-2 py-1.5 text-xs"
              style={{ border: '1px solid var(--paper-edge)', background: 'var(--paper)', width: 180 }}
            />
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
            <div
              key={b.label}
              className="rounded-lg p-3"
              style={{
                background: i === 2 ? 'var(--accent-soft)' : 'var(--surface)',
                border: `1px solid ${i === 2 ? 'var(--accent)' : 'var(--paper-edge)'}`,
              }}
            >
              <div className="text-xs mb-1" style={{ color: i === 2 ? 'var(--accent)' : 'var(--ink-2)' }}>
                {b.label}
              </div>
              <div className="font-mono font-bold text-sm">R —</div>
              <div className="text-xs mt-0.5" style={{ color: 'var(--muted)' }}>—</div>
            </div>
          ))}
        </div>
      </div>

      {/* Customer table */}
      <div className="rounded-lg overflow-hidden" style={{ border: '1px solid var(--paper-edge)' }}>
        <table className="w-full text-xs">
          <thead>
            <tr style={{ background: 'var(--paper-edge)' }}>
              {['Customer', 'VAT no.', 'Open', 'Overdue', 'YTD sales', 'Last txn'].map(h => (
                <th
                  key={h}
                  className={`px-3 py-2 text-left font-medium ${['Open','Overdue','YTD sales'].includes(h) ? 'text-right' : ''}`}
                  style={{ color: 'var(--ink-2)' }}
                >
                  {h}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {loading
              ? [...Array(5)].map((_, i) => (
                  <tr key={i} style={{ borderBottom: '1px solid var(--paper-edge)' }}>
                    {[...Array(6)].map((_, j) => (
                      <td key={j} className="px-3 py-2">
                        <div className="h-3 rounded animate-pulse" style={{ background: 'var(--paper-edge)' }} />
                      </td>
                    ))}
                  </tr>
                ))
              : filtered.map(c => (
                  <tr
                    key={c.id}
                    className="cursor-pointer hover:opacity-80"
                    style={{
                      borderBottom: '1px solid var(--paper-edge)',
                      background: c.overdue > 0 ? 'var(--accent-soft)' : 'var(--surface)',
                    }}
                  >
                    <td className="px-3 py-2 font-medium">{c.name}</td>
                    <td className="px-3 py-2 font-mono" style={{ color: 'var(--ink-2)' }}>{c.vat_number ?? '—'}</td>
                    <td className="px-3 py-2 font-mono text-right">{c.open > 0 ? c.open.toLocaleString('en-ZA', { minimumFractionDigits: 2 }) : '—'}</td>
                    <td className="px-3 py-2 font-mono text-right" style={{ color: c.overdue > 0 ? 'var(--accent)' : undefined }}>
                      {c.overdue > 0 ? c.overdue.toLocaleString('en-ZA', { minimumFractionDigits: 2 }) : '—'}
                    </td>
                    <td className="px-3 py-2 font-mono text-right">{c.ytd_sales > 0 ? c.ytd_sales.toLocaleString('en-ZA', { minimumFractionDigits: 2 }) : '—'}</td>
                    <td className="px-3 py-2 font-mono" style={{ color: 'var(--ink-2)' }}>{c.last_txn || '—'}</td>
                  </tr>
                ))}
            {!loading && filtered.length === 0 && (
              <tr>
                <td colSpan={6} className="px-3 py-8 text-center" style={{ color: 'var(--muted)' }}>
                  No customers yet
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  )
}
