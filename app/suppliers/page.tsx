'use client'
import { useEffect, useState } from 'react'
import { supabase } from '@/lib/supabase'
import { formatMoney } from '@/lib/utils'
import type { Contact } from '@/lib/types'
import Button from '@/components/ui/Button'

interface SupplierRow extends Contact {
  open_ap: number
  overdue_ap: number
  bill_count: number
  last_bill: string | null
}

const todayStr = new Date().toISOString().slice(0, 10)

export default function SuppliersPage() {
  const [suppliers, setSuppliers] = useState<SupplierRow[]>([])
  const [loading, setLoading]     = useState(true)
  const [showAdd, setShowAdd]     = useState(false)
  const [newName, setNewName]     = useState('')
  const [newEmail, setNewEmail]   = useState('')
  const [newVat, setNewVat]       = useState('')
  const [saving, setSaving]       = useState(false)
  const [search, setSearch]       = useState('')

  async function load() {
    const [{ data: contacts }, { data: bills }] = await Promise.all([
      supabase
        .from('acct_contacts')
        .select('*')
        .in('type', ['supplier', 'both'])
        .eq('is_active', true)
        .order('name'),
      supabase
        .from('acct_invoices')
        .select('contact_id, total, status, due_date, date')
        .eq('invoice_type', 'bill')
        .neq('status', 'void'),
    ])

    if (!contacts) return

    const billMap: Record<string, { open: number; overdue: number; count: number; lastDate: string | null }> = {}
    for (const b of (bills ?? [])) {
      if (!billMap[b.contact_id]) billMap[b.contact_id] = { open: 0, overdue: 0, count: 0, lastDate: null }
      const m = billMap[b.contact_id]
      m.count++
      if (!m.lastDate || b.date > m.lastDate) m.lastDate = b.date
      if (['draft', 'sent'].includes(b.status)) {
        m.open += Number(b.total)
        if (b.status === 'sent' && b.due_date && b.due_date < todayStr) {
          m.overdue += Number(b.total)
        }
      }
    }

    setSuppliers(contacts.map(c => ({
      ...c,
      open_ap:   billMap[c.id]?.open ?? 0,
      overdue_ap: billMap[c.id]?.overdue ?? 0,
      bill_count: billMap[c.id]?.count ?? 0,
      last_bill:  billMap[c.id]?.lastDate ?? null,
    })))
    setLoading(false)
  }

  useEffect(() => { load() }, [])

  async function addSupplier() {
    if (!newName.trim()) return
    setSaving(true)
    const { data } = await supabase
      .from('acct_contacts')
      .insert({
        name: newName.trim(),
        type: 'supplier',
        email: newEmail.trim() || null,
        vat_number: newVat.trim() || null,
        is_active: true,
      })
      .select()
      .single()
    if (data) {
      setSuppliers(prev =>
        [...prev, { ...data, open_ap: 0, overdue_ap: 0, bill_count: 0, last_bill: null }]
          .sort((a, b) => a.name.localeCompare(b.name))
      )
    }
    setNewName(''); setNewEmail(''); setNewVat('')
    setShowAdd(false); setSaving(false)
  }

  const filtered = search
    ? suppliers.filter(s => s.name.toLowerCase().includes(search.toLowerCase()) || s.email?.toLowerCase().includes(search.toLowerCase()))
    : suppliers

  const totalOpen    = suppliers.reduce((s, r) => s + r.open_ap, 0)
  const totalOverdue = suppliers.reduce((s, r) => s + r.overdue_ap, 0)
  const overdueCount = suppliers.filter(s => s.overdue_ap > 0).length

  return (
    <div className="p-5 max-w-5xl">
      <div className="flex items-start justify-between mb-4">
        <div>
          <h1 className="text-xl font-semibold">Suppliers</h1>
          <p className="text-xs mt-0.5 t-secondary">
            {suppliers.length} active · {overdueCount > 0 ? `${overdueCount} with overdue AP · ` : ''}
            <a href="/purchases" className="t-accent no-underline">← Purchases</a>
          </p>
        </div>
        <div className="flex gap-2 items-center">
          <div className="search-box" style={{ width: 200 }}>
            <span className="text-muted text-xs">⌕</span>
            <input
              placeholder="Search suppliers…"
              value={search}
              onChange={e => setSearch(e.target.value)}
            />
          </div>
          <Button size="sm" onClick={() => setShowAdd(v => !v)}>+ Add supplier</Button>
        </div>
      </div>

      {/* Summary KPIs */}
      <div className="grid grid-cols-3 gap-3 mb-4">
        <div className="card kpi">
          <p className="kpi-label">Active suppliers</p>
          <p className="kpi-value">{suppliers.length}</p>
          <p className="kpi-sub">with any history</p>
        </div>
        <div className="card kpi">
          <p className="kpi-label">Total open AP</p>
          <p className="kpi-value num">{formatMoney(totalOpen)}</p>
          <p className="kpi-sub">across all suppliers</p>
        </div>
        <div className={totalOverdue > 0 ? 'card-accent kpi' : 'card kpi'}>
          <p className="kpi-label">Overdue AP</p>
          <p className="kpi-value" style={{ color: totalOverdue > 0 ? 'var(--negative)' : 'var(--ink)' }}>
            {formatMoney(totalOverdue)}
          </p>
          <p className="kpi-sub">{overdueCount} supplier{overdueCount !== 1 ? 's' : ''}</p>
        </div>
      </div>

      {/* Add form */}
      {showAdd && (
        <div className="card p-4 mb-4 flex gap-3 items-end flex-wrap">
          <div>
            <label className="field-label">Name *</label>
            <input
              className="field"
              style={{ width: 200 }}
              value={newName}
              onChange={e => setNewName(e.target.value)}
              placeholder="Supplier name"
              onKeyDown={e => e.key === 'Enter' && addSupplier()}
              autoFocus
            />
          </div>
          <div>
            <label className="field-label">Email</label>
            <input className="field" style={{ width: 200 }} value={newEmail} onChange={e => setNewEmail(e.target.value)} placeholder="billing@supplier.co.za" type="email" />
          </div>
          <div>
            <label className="field-label">VAT number</label>
            <input className="field" style={{ width: 140 }} value={newVat} onChange={e => setNewVat(e.target.value)} placeholder="4123456789" />
          </div>
          <Button size="sm" onClick={addSupplier} disabled={saving || !newName.trim()}>
            {saving ? 'Saving…' : 'Save'}
          </Button>
          <Button variant="ghost" size="sm" onClick={() => setShowAdd(false)}>Cancel</Button>
        </div>
      )}

      {/* Table */}
      <div className="card overflow-hidden">
        <table className="w-full text-xs">
          <thead className="t-head">
            <tr>
              <th className="text-left">Name</th>
              <th className="text-left">Email</th>
              <th className="text-left">VAT no.</th>
              <th className="text-right">Bills</th>
              <th className="text-right">Open AP</th>
              <th className="text-right">Overdue</th>
              <th className="text-left">Last bill</th>
            </tr>
          </thead>
          <tbody>
            {loading
              ? [...Array(5)].map((_, i) => (
                  <tr key={i} className="t-row">
                    {[...Array(7)].map((_, j) => (
                      <td key={j} className="t-cell">
                        <div className="h-3 rounded animate-pulse bg-paper-edge" />
                      </td>
                    ))}
                  </tr>
                ))
              : filtered.map(s => (
                  <tr
                    key={s.id}
                    className="t-row"
                    style={{ background: s.overdue_ap > 0 ? 'rgba(192,57,43,0.04)' : undefined }}
                  >
                    <td className="t-cell font-medium">{s.name}</td>
                    <td className="t-cell t-secondary">{s.email ?? '—'}</td>
                    <td className="t-cell font-mono t-secondary">{s.vat_number ?? '—'}</td>
                    <td className="t-cell num t-secondary">{s.bill_count}</td>
                    <td className="t-cell num">
                      {s.open_ap > 0 ? formatMoney(s.open_ap) : <span className="t-secondary">—</span>}
                    </td>
                    <td className="t-cell num" style={{ color: s.overdue_ap > 0 ? 'var(--negative)' : undefined }}>
                      {s.overdue_ap > 0 ? formatMoney(s.overdue_ap) : <span className="t-secondary">—</span>}
                    </td>
                    <td className="t-cell t-secondary">
                      {s.last_bill
                        ? new Date(s.last_bill).toLocaleDateString('en-ZA', { day: '2-digit', month: 'short', year: '2-digit' })
                        : '—'}
                    </td>
                  </tr>
                ))}
            {!loading && filtered.length === 0 && (
              <tr className="t-empty"><td colSpan={7}>{search ? 'No suppliers match' : 'No suppliers yet'}</td></tr>
            )}
          </tbody>
          {!loading && suppliers.length > 0 && (
            <tfoot>
              <tr className="border-t-2 border-paper-edge" style={{ background: 'var(--accent-soft)' }}>
                <td colSpan={4} className="px-3 py-2 font-semibold">Total</td>
                <td className="px-3 py-2 num font-semibold">{formatMoney(totalOpen)}</td>
                <td className="px-3 py-2 num font-semibold" style={{ color: totalOverdue > 0 ? 'var(--negative)' : undefined }}>
                  {totalOverdue > 0 ? formatMoney(totalOverdue) : '—'}
                </td>
                <td />
              </tr>
            </tfoot>
          )}
        </table>
      </div>
    </div>
  )
}
