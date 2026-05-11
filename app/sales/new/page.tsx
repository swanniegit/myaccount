'use client'
import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { supabase } from '@/lib/supabase'
import { formatMoney, today, VAT_RATE } from '@/lib/utils'
import type { Contact, Account } from '@/lib/types'
import Button from '@/components/ui/Button'

interface LineItem {
  description: string
  qty: string
  unit_price: string
  vat_rate: string
}

export default function NewInvoicePage() {
  const router = useRouter()
  const [contacts, setContacts] = useState<Contact[]>([])
  const [accounts, setAccounts] = useState<Account[]>([])
  const [contactId, setContactId] = useState('')
  const [vatRegNo, setVatRegNo] = useState('')
  const [date, setDate] = useState(today())
  const [dueDate, setDueDate] = useState('')
  const [lines, setLines] = useState<LineItem[]>([
    { description: '', qty: '1', unit_price: '', vat_rate: '15' },
  ])
  const [notes, setNotes] = useState('')
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')
  const [invoiceNumber, setInvoiceNumber] = useState('INV-001')
  const [addingContact, setAddingContact] = useState(false)
  const [newContactName, setNewContactName] = useState('')
  const [newContactVat, setNewContactVat] = useState('')
  const [newContactEmail, setNewContactEmail] = useState('')

  useEffect(() => {
    supabase.from('acct_contacts').select('*').eq('type', 'customer').order('name').then(({ data }) => {
      if (data) setContacts(data)
    })
    supabase.from('acct_accounts').select('*').order('code').then(({ data }) => {
      if (data) setAccounts(data)
    })
    // Auto-generate invoice number
    supabase
      .from('acct_invoices')
      .select('number')
      .order('created_at', { ascending: false })
      .limit(1)
      .then(({ data }) => {
        if (data && data.length > 0) {
          const last = data[0].number
          const num = parseInt(last.replace('INV-', '')) + 1
          setInvoiceNumber(`INV-${String(num).padStart(3, '0')}`)
        }
      })
  }, [])

  function calcLine(l: LineItem) {
    const qty = parseFloat(l.qty) || 0
    const unit = parseFloat(l.unit_price) || 0
    const excl = qty * unit
    const vatRate = parseFloat(l.vat_rate) / 100
    const vat = excl * vatRate
    return { excl, vat, total: excl + vat }
  }

  const subtotal = lines.reduce((s, l) => s + calcLine(l).excl, 0)
  const vatTotal = lines.reduce((s, l) => s + calcLine(l).vat, 0)
  const total = subtotal + vatTotal

  async function save(status: 'draft' | 'sent') {
    setSaving(true)
    setError('')
    try {
      const { data: inv, error: invErr } = await supabase
        .from('acct_invoices')
        .insert({
          number: invoiceNumber,
          contact_id: contactId || null,
          date,
          due_date: dueDate || null,
          status,
          subtotal,
          vat_amount: vatTotal,
          total,
          notes: notes || null,
        })
        .select()
        .single()

      if (invErr) throw new Error(invErr.message)

      const invLines = lines
        .filter(l => l.description && l.unit_price)
        .map(l => {
          const { excl, vat, total: lt } = calcLine(l)
          return {
            invoice_id: inv.id,
            description: l.description,
            quantity: parseFloat(l.qty) || 1,
            unit_price: parseFloat(l.unit_price) || 0,
            vat_rate: parseFloat(l.vat_rate) || 15,
            line_total: lt,
          }
        })

      if (invLines.length > 0) {
        const { error: lErr } = await supabase.from('acct_invoice_lines').insert(invLines)
        if (lErr) throw new Error(lErr.message)
      }

      router.push('/sales')
    } catch (e: any) {
      setError(e.message)
    } finally {
      setSaving(false)
    }
  }

  async function saveNewContact() {
    if (!newContactName) return
    const { data } = await supabase
      .from('acct_contacts')
      .insert({ name: newContactName, type: 'customer', vat_number: newContactVat || null, email: newContactEmail || null })
      .select().single()
    if (data) {
      setContacts(prev => [...prev, data])
      setContactId(data.id)
      if (data.vat_number) setVatRegNo(data.vat_number)
    }
    setNewContactName(''); setNewContactVat(''); setNewContactEmail(''); setAddingContact(false)
  }

  const arAccount = accounts.find(a => a.code === '1100')
  const salesAccount = accounts.find(a => a.code === '4000')
  const vatAccount = accounts.find(a => a.code === '2100')

  return (
    <div className="p-5 max-w-4xl">
      <div className="mb-1">
        <h1 className="text-xl font-semibold">New invoice</h1>
        <p className="text-xs" style={{ color: 'var(--ink-2)' }}>SARS-compliant tax invoice · VAT 15%</p>
      </div>

      {/* Sub-header */}
      <div className="flex items-center justify-between mb-5">
        <span className="text-sm font-medium" style={{ color: 'var(--ink-2)' }}>
          {invoiceNumber} · <span style={{ color: 'var(--muted)' }}>draft</span>
        </span>
        <div className="flex gap-2">
          <Button variant="secondary" size="sm" type="button">Preview PDF</Button>
          <Button variant="ghost" size="sm" type="button" onClick={() => save('draft')} disabled={saving}>
            Save draft
          </Button>
          <Button size="sm" type="button" onClick={() => save('sent')} disabled={saving}>
            Send via email
          </Button>
        </div>
      </div>

      <div className="flex gap-6">
        {/* Left: form */}
        <div className="flex-1">
          <div
            className="rounded-lg p-5"
            style={{ background: 'var(--surface)', border: '1px solid var(--paper-edge)' }}
          >
            <div className="grid grid-cols-2 gap-3 mb-4">
              <Field label="Bill to (customer)">
                <select
                  value={contactId}
                  onChange={e => {
                    if (e.target.value === '__add__') { setAddingContact(true); return }
                    setContactId(e.target.value)
                    const c = contacts.find(x => x.id === e.target.value)
                    if (c?.vat_number) setVatRegNo(c.vat_number)
                  }}
                  className="w-full"
                >
                  <option value="">Select customer…</option>
                  {contacts.map(c => (
                    <option key={c.id} value={c.id}>{c.name}</option>
                  ))}
                  <option value="__add__">+ Add customer…</option>
                </select>
              </Field>
              {addingContact && (
                <div className="col-span-2 flex gap-2 items-end p-3 rounded" style={{ background: 'var(--paper)', border: '1px solid var(--accent)' }}>
                  <div className="flex-1">
                    <label className="text-xs block mb-1" style={{ color: 'var(--ink-2)' }}>Name *</label>
                    <input value={newContactName} onChange={e => setNewContactName(e.target.value)} placeholder="Customer name" className="w-full rounded px-2 py-1 text-xs" style={{ border: '1px solid var(--paper-edge)', background: 'var(--surface)' }} />
                  </div>
                  <div>
                    <label className="text-xs block mb-1" style={{ color: 'var(--ink-2)' }}>VAT no.</label>
                    <input value={newContactVat} onChange={e => setNewContactVat(e.target.value)} placeholder="optional" className="w-24 rounded px-2 py-1 text-xs" style={{ border: '1px solid var(--paper-edge)', background: 'var(--surface)' }} />
                  </div>
                  <div>
                    <label className="text-xs block mb-1" style={{ color: 'var(--ink-2)' }}>Email</label>
                    <input value={newContactEmail} onChange={e => setNewContactEmail(e.target.value)} placeholder="optional" className="w-36 rounded px-2 py-1 text-xs" style={{ border: '1px solid var(--paper-edge)', background: 'var(--surface)' }} />
                  </div>
                  <button onClick={saveNewContact} className="px-3 py-1 rounded text-xs text-white" style={{ background: 'var(--accent)' }}>Save</button>
                  <button onClick={() => setAddingContact(false)} className="px-3 py-1 rounded text-xs" style={{ border: '1px solid var(--paper-edge)' }}>Cancel</button>
                </div>
              )}
              <Field label="VAT registration no.">
                <input type="text" value={vatRegNo} onChange={e => setVatRegNo(e.target.value)} className="w-full" />
              </Field>
              <Field label="Invoice date">
                <input type="date" value={date} onChange={e => setDate(e.target.value)} className="w-full" />
              </Field>
              <Field label="Due date">
                <input type="date" value={dueDate} onChange={e => setDueDate(e.target.value)} placeholder="14/04/2026 (Net 30)" className="w-full" />
              </Field>
            </div>

            {/* Line items */}
            <div className="text-xs font-medium mb-2">Line items</div>
            <table className="w-full text-xs mb-1">
              <thead>
                <tr style={{ borderBottom: '1px solid var(--paper-edge)' }}>
                  {['Description', 'Qty', 'Unit (excl.)', 'VAT', 'Total'].map(h => (
                    <th key={h} className={`py-1.5 font-medium text-left ${h !== 'Description' ? 'text-right pl-2' : ''}`} style={{ color: 'var(--ink-2)' }}>
                      {h}
                    </th>
                  ))}
                  <th className="w-5" />
                </tr>
              </thead>
              <tbody>
                {lines.map((line, i) => {
                  const { total: lt } = calcLine(line)
                  return (
                    <tr key={i} style={{ borderBottom: '1px solid var(--paper-edge)' }}>
                      <td className="py-1.5 pr-2">
                        <input
                          type="text"
                          value={line.description}
                          onChange={e => setLines(prev => prev.map((l, j) => j === i ? { ...l, description: e.target.value } : l))}
                          placeholder="e.g. Consulting – March"
                          className="w-full"
                        />
                      </td>
                      <td className="py-1.5 pl-2 w-12">
                        <input
                          type="number"
                          value={line.qty}
                          onChange={e => setLines(prev => prev.map((l, j) => j === i ? { ...l, qty: e.target.value } : l))}
                          className="w-full text-right font-mono"
                        />
                      </td>
                      <td className="py-1.5 pl-2 w-24">
                        <input
                          type="number"
                          step="0.01"
                          value={line.unit_price}
                          onChange={e => setLines(prev => prev.map((l, j) => j === i ? { ...l, unit_price: e.target.value } : l))}
                          className="w-full text-right font-mono"
                        />
                      </td>
                      <td className="py-1.5 pl-2 w-16">
                        <select
                          value={line.vat_rate}
                          onChange={e => setLines(prev => prev.map((l, j) => j === i ? { ...l, vat_rate: e.target.value } : l))}
                          className="w-full text-right"
                        >
                          <option value="15">15%</option>
                          <option value="0">0%</option>
                        </select>
                      </td>
                      <td className="py-1.5 pl-2 font-mono text-right w-24">
                        {lt > 0 ? lt.toLocaleString('en-ZA', { minimumFractionDigits: 2 }) : '—'}
                      </td>
                      <td className="py-1.5 pl-1">
                        {lines.length > 1 && (
                          <button onClick={() => setLines(prev => prev.filter((_, j) => j !== i))} style={{ color: 'var(--muted)' }}>×</button>
                        )}
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
            <button
              onClick={() => setLines(prev => [...prev, { description: '', qty: '1', unit_price: '', vat_rate: '15' }])}
              className="text-xs mb-4"
              style={{ color: 'var(--muted)', fontStyle: 'italic' }}
            >
              + add line…
            </button>

            <div
              className="text-xs px-3 py-2 rounded"
              style={{ border: '1px dashed var(--accent)', color: 'var(--accent)', fontStyle: 'italic' }}
            >
              Bank details from Settings inserted automatically on PDF
            </div>
          </div>
        </div>

        {/* Right: totals + post preview */}
        <div className="w-56 shrink-0">
          <div className="rounded-lg p-4 mb-3" style={{ background: 'var(--surface)', border: '1px solid var(--paper-edge)' }}>
            <div className="text-xs font-medium mb-3">Totals</div>
            <div className="flex justify-between text-xs mb-1.5">
              <span style={{ color: 'var(--ink-2)' }}>Subtotal</span>
              <span className="font-mono">{subtotal > 0 ? subtotal.toLocaleString('en-ZA', { minimumFractionDigits: 2 }) : '—'}</span>
            </div>
            <div className="flex justify-between text-xs mb-2" style={{ borderBottom: '1px solid var(--paper-edge)', paddingBottom: 8 }}>
              <span style={{ color: 'var(--ink-2)' }}>VAT (15%)</span>
              <span className="font-mono">{vatTotal > 0 ? vatTotal.toLocaleString('en-ZA', { minimumFractionDigits: 2 }) : '—'}</span>
            </div>
            <div className="flex justify-between text-sm font-semibold">
              <span>Total</span>
              <span className="font-mono" style={{ color: 'var(--accent)' }}>
                {total > 0 ? formatMoney(total) : '—'}
              </span>
            </div>
          </div>

          {total > 0 && (
            <div className="rounded-lg p-4" style={{ background: 'var(--paper)', border: '1px solid var(--paper-edge)' }}>
              <div className="text-xs font-medium mb-2">Will post (preview)</div>
              <div className="font-mono text-2xs space-y-0.5" style={{ color: 'var(--ink-2)', fontSize: 11 }}>
                <div>Dr {arAccount?.code ?? '1100'} AR ........ {total.toLocaleString('en-ZA', { minimumFractionDigits: 2 })}</div>
                <div>Cr {salesAccount?.code ?? '4000'} Sales ... {subtotal.toLocaleString('en-ZA', { minimumFractionDigits: 2 })}</div>
                <div>Cr {vatAccount?.code ?? '2220'} VAT Out .. {vatTotal.toLocaleString('en-ZA', { minimumFractionDigits: 2 })}</div>
              </div>
              <button className="text-xs mt-2" style={{ color: 'var(--accent)' }}>
                view T-accounts &gt;
              </button>
            </div>
          )}
        </div>
      </div>

      {error && <p className="text-xs mt-3" style={{ color: 'var(--negative)' }}>{error}</p>}
    </div>
  )
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <label className="block text-xs mb-1" style={{ color: 'var(--ink-2)' }}>{label}</label>
      <div className="[&>input]:w-full [&>input]:px-2.5 [&>input]:py-1.5 [&>input]:rounded [&>input]:text-xs [&>input]:bg-[var(--paper)] [&>input]:[border:1px_solid_var(--paper-edge)] [&>select]:w-full [&>select]:px-2.5 [&>select]:py-1.5 [&>select]:rounded [&>select]:text-xs [&>select]:bg-[var(--paper)] [&>select]:[border:1px_solid_var(--paper-edge)]">
        {children}
      </div>
    </div>
  )
}
