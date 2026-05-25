'use client'
import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { supabase } from '@/lib/supabase'
import { formatMoney, today } from '@/lib/utils'
import type { Contact, Account } from '@/lib/types'
import { recordJournalEntryClient } from '@/lib/ledger'
import Button from '@/components/ui/Button'

interface LineItem {
  description: string
  qty: string
  unit_price: string
  vat_rate: string
  account_id: string
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
    { description: '', qty: '1', unit_price: '', vat_rate: '15', account_id: '' },
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
      if (data) {
        setAccounts(data)
        const firstRevenue = data.find(a => a.type === 'revenue')
        if (firstRevenue) {
          setLines([{ description: '', qty: '1', unit_price: '', vat_rate: '15', account_id: firstRevenue.id }])
        }
      }
    })
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

  const revenueAccounts = accounts.filter(a => a.type === 'revenue')

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

      const validLines = lines.filter(l => l.description && l.unit_price)

      const invLines = validLines.map(l => {
        const { excl, vat, total: lt } = calcLine(l)
        return {
          invoice_id: inv.id,
          description: l.description,
          quantity: parseFloat(l.qty) || 1,
          unit_price: parseFloat(l.unit_price) || 0,
          vat_rate: parseFloat(l.vat_rate) || 15,
          account_id: l.account_id || null,
          line_total: lt,
        }
      })

      if (invLines.length > 0) {
        const { error: lErr } = await supabase.from('acct_invoice_lines').insert(invLines)
        if (lErr) throw new Error(lErr.message)
      }

      // Post GL journal entry — per-line revenue accounts (G-06, G-10)
      if (total > 0 && validLines.length > 0) {
        const arAccId = accounts.find(a => a.code === '1100')?.id
        const vatAccId = accounts.find(a => a.code === '2100')?.id
        const fallbackRevId = revenueAccounts[0]?.id

        if (arAccId && vatAccId) {
          // Group excl amounts by account_id
          const revCredits = new Map<string, number>()
          for (const l of validLines) {
            const { excl } = calcLine(l)
            if (excl <= 0) continue
            const accId = l.account_id || fallbackRevId
            if (!accId) continue
            revCredits.set(accId, (revCredits.get(accId) ?? 0) + excl)
          }

          const journalLines = [
            { account_id: arAccId, debit: total, credit: 0, description: `AR — ${invoiceNumber}` },
            ...Array.from(revCredits.entries()).map(([accId, excl]) => ({
              account_id: accId,
              debit: 0,
              credit: excl,
              description: `Revenue — ${invoiceNumber}`,
            })),
            { account_id: vatAccId, debit: 0, credit: vatTotal, description: `VAT Output — ${invoiceNumber}` },
          ]

          try {
            const { entry } = await recordJournalEntryClient({
              date,
              description: `Invoice ${invoiceNumber}`,
              reference: invoiceNumber,
              source: 'invoice',
              lines: journalLines,
            })
            await supabase
              .from('acct_invoices')
              .update({ journal_entry_id: entry.id })
              .eq('id', inv.id)
          } catch (glErr: any) {
            throw new Error(`Invoice saved but GL posting failed: ${glErr.message}`)
          }
        }
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
  const vatAccount = accounts.find(a => a.code === '2100')

  return (
    <div className="p-5 max-w-5xl">
      <div className="mb-1">
        <h1 className="text-xl font-semibold">New invoice</h1>
        <p className="text-xs text-ink-2">SARS-compliant tax invoice · VAT 15%</p>
      </div>

      <div className="flex items-center justify-between mb-5">
        <span className="text-sm font-medium text-ink-2">
          {invoiceNumber} · <span className="text-muted">draft</span>
        </span>
        <div className="flex gap-2">
          <Button variant="secondary" size="sm" type="button">Preview PDF</Button>
          <Button variant="ghost" size="sm" type="button" onClick={() => save('draft')} disabled={saving}>Save draft</Button>
          <Button size="sm" type="button" onClick={() => save('sent')} disabled={saving}>Send via email</Button>
        </div>
      </div>

      <div className="flex gap-6">
        <div className="flex-1">
          <div className="card p-5">
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
                <div className="col-span-2 flex gap-2 items-end p-3 rounded bg-paper border border-accent">
                  <div className="flex-1">
                    <label className="field-label">Name *</label>
                    <input value={newContactName} onChange={e => setNewContactName(e.target.value)} placeholder="Customer name" className="field" />
                  </div>
                  <div>
                    <label className="field-label">VAT no.</label>
                    <input value={newContactVat} onChange={e => setNewContactVat(e.target.value)} placeholder="optional" className="field" style={{ width: 96 }} />
                  </div>
                  <div>
                    <label className="field-label">Email</label>
                    <input value={newContactEmail} onChange={e => setNewContactEmail(e.target.value)} placeholder="optional" className="field" style={{ width: 144 }} />
                  </div>
                  <button onClick={saveNewContact} className="btn btn-sm btn-primary">Save</button>
                  <button onClick={() => setAddingContact(false)} className="btn btn-sm btn-ghost">Cancel</button>
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

            <div className="text-xs font-medium mb-2">Line items</div>
            <table className="w-full text-xs mb-1">
              <thead>
                <tr className="border-b border-paper-edge">
                  {['Description', 'Account', 'Qty', 'Unit (excl.)', 'VAT', 'Total'].map(h => (
                    <th key={h} className={`py-1.5 font-medium text-left text-ink-2 ${h !== 'Description' && h !== 'Account' ? 'text-right pl-2' : 'pl-0'}`}>
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
                    <tr key={i} className="border-b border-paper-edge">
                      <td className="py-1.5 pr-2">
                        <input
                          type="text"
                          value={line.description}
                          onChange={e => setLines(prev => prev.map((l, j) => j === i ? { ...l, description: e.target.value } : l))}
                          placeholder="e.g. Consulting – March"
                          className="w-full"
                        />
                      </td>
                      <td className="py-1.5 pr-2 w-36">
                        <select
                          value={line.account_id}
                          onChange={e => setLines(prev => prev.map((l, j) => j === i ? { ...l, account_id: e.target.value } : l))}
                          className="w-full"
                        >
                          {revenueAccounts.map(a => (
                            <option key={a.id} value={a.id}>{a.code} {a.name}</option>
                          ))}
                        </select>
                      </td>
                      <td className="py-1.5 pl-2 w-12">
                        <input
                          type="number"
                          value={line.qty}
                          onChange={e => setLines(prev => prev.map((l, j) => j === i ? { ...l, qty: e.target.value } : l))}
                          className="w-full text-right num"
                        />
                      </td>
                      <td className="py-1.5 pl-2 w-24">
                        <input
                          type="number"
                          step="0.01"
                          value={line.unit_price}
                          onChange={e => setLines(prev => prev.map((l, j) => j === i ? { ...l, unit_price: e.target.value } : l))}
                          className="w-full text-right num"
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
                      <td className="py-1.5 pl-2 num text-right w-24">
                        {lt > 0 ? lt.toLocaleString('en-ZA', { minimumFractionDigits: 2 }) : '—'}
                      </td>
                      <td className="py-1.5 pl-1">
                        {lines.length > 1 && (
                          <button onClick={() => setLines(prev => prev.filter((_, j) => j !== i))} className="text-muted">×</button>
                        )}
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
            <button
              onClick={() => setLines(prev => [...prev, { description: '', qty: '1', unit_price: '', vat_rate: '15', account_id: revenueAccounts[0]?.id ?? '' }])}
              className="text-xs mb-4 italic text-muted"
            >
              + add line…
            </button>

            <div className="notice notice-accent text-xs italic">
              Bank details from Settings inserted automatically on PDF
            </div>
          </div>
        </div>

        <div className="w-56 shrink-0">
          <div className="card p-4 mb-3">
            <div className="text-xs font-medium mb-3">Totals</div>
            <div className="flex justify-between text-xs mb-1.5">
              <span className="text-ink-2">Subtotal</span>
              <span className="num">{subtotal > 0 ? subtotal.toLocaleString('en-ZA', { minimumFractionDigits: 2 }) : '—'}</span>
            </div>
            <div className="flex justify-between text-xs mb-2 pb-2 border-b border-paper-edge">
              <span className="text-ink-2">VAT (15%)</span>
              <span className="num">{vatTotal > 0 ? vatTotal.toLocaleString('en-ZA', { minimumFractionDigits: 2 }) : '—'}</span>
            </div>
            <div className="flex justify-between text-sm font-semibold">
              <span>Total</span>
              <span className="num text-accent">{total > 0 ? formatMoney(total) : '—'}</span>
            </div>
          </div>

          {total > 0 && (
            <div className="rounded-lg p-4 bg-paper border border-paper-edge">
              <div className="text-xs font-medium mb-2">Will post on save</div>
              <div className="num space-y-0.5 text-ink-2" style={{ fontSize: 11 }}>
                <div>Dr {arAccount?.code ?? '1100'} AR ........ {total.toLocaleString('en-ZA', { minimumFractionDigits: 2 })}</div>
                {lines.filter(l => l.description && l.unit_price).map((l, i) => {
                  const acc = accounts.find(a => a.id === l.account_id)
                  const { excl } = calcLine(l)
                  return excl > 0 ? (
                    <div key={i}>Cr {acc?.code ?? '4xxx'} {acc?.name?.split(' ')[0] ?? 'Rev'} .. {excl.toLocaleString('en-ZA', { minimumFractionDigits: 2 })}</div>
                  ) : null
                })}
                <div>Cr {vatAccount?.code ?? '2100'} VAT Out .. {vatTotal.toLocaleString('en-ZA', { minimumFractionDigits: 2 })}</div>
              </div>
            </div>
          )}
        </div>
      </div>

      {error && <p className="text-xs mt-3 text-negative">{error}</p>}
    </div>
  )
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <label className="field-label">{label}</label>
      <div className="field-wrap">{children}</div>
    </div>
  )
}
