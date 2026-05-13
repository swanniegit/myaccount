'use client'
import { useEffect, useState } from 'react'
import { supabase } from '@/lib/supabase'
import { formatMoney, today } from '@/lib/utils'
import type { Contact, Invoice } from '@/lib/types'
import Button from '@/components/ui/Button'

const METHODS = ['EFT', 'Cash', 'Card', 'Cheque', 'Credit note']

export default function RecordPaymentPage() {
  const [contacts, setContacts] = useState<Contact[]>([])
  const [invoices, setInvoices] = useState<Invoice[]>([])
  const [contactId, setContactId] = useState('')
  const [date, setDate] = useState(today())
  const [amount, setAmount] = useState('')
  const [bankAccount, setBankAccount] = useState('1000 · FNB Cheque')
  const [method, setMethod] = useState('EFT')
  const [reference, setReference] = useState('')
  const [selected, setSelected] = useState<Set<string>>(new Set())
  const [saved, setSaved] = useState(false)
  const [addingContact, setAddingContact] = useState(false)
  const [newContactName, setNewContactName] = useState('')
  const [newContactVat, setNewContactVat] = useState('')
  const [newContactEmail, setNewContactEmail] = useState('')

  useEffect(() => {
    supabase.from('acct_contacts').select('*').in('type', ['customer','both']).order('name').then(({ data }) => {
      if (data) setContacts(data)
    })
  }, [])

  useEffect(() => {
    if (!contactId) return
    supabase
      .from('acct_invoices')
      .select('*, contact:acct_contacts(name)')
      .eq('contact_id', contactId)
      .in('status', ['sent', 'overdue'])
      .order('date')
      .then(({ data }) => {
        if (data) setInvoices(data as Invoice[])
      })
  }, [contactId])

  const selectedContact = contacts.find(c => c.id === contactId)
  const amountNum = parseFloat(amount) || 0
  const selectedInvoices = invoices.filter(i => selected.has(i.id))
  const applying = selectedInvoices.reduce((s, i) => s + Number(i.total), 0)

  async function saveNewContact() {
    if (!newContactName) return
    const { data } = await supabase
      .from('acct_contacts')
      .insert({ name: newContactName, type: 'customer', vat_number: newContactVat || null, email: newContactEmail || null })
      .select().single()
    if (data) {
      setContacts(prev => [...prev, data])
      setContactId(data.id)
    }
    setNewContactName(''); setNewContactVat(''); setNewContactEmail(''); setAddingContact(false)
  }

  function toggleInvoice(id: string) {
    setSelected(prev => {
      const next = new Set(prev)
      if (next.has(id)) next.delete(id)
      else next.add(id)
      return next
    })
  }

  const arBalance = invoices.reduce((s, i) => s + Number(i.total), 0)

  return (
    <div className="p-5 max-w-3xl">
      <div className="mb-1">
        <h1 className="text-xl font-semibold">Record payment</h1>
        <p className="text-xs mt-0.5 text-ink-2">Step 3 of the flow · pay an invoice or apply a deposit</p>
      </div>

      {selectedContact && (
        <div className="text-base font-medium mb-1 italic">Payment from {selectedContact.name}</div>
      )}
      {!selectedContact && (
        <div className="text-sm mb-1 text-muted">Select a customer to begin</div>
      )}
      <p className="text-xs mb-4 text-ink-2">Match a receipt against one or more outstanding invoices.</p>

      <div className="flex gap-4">
        {/* Left: form */}
        <div className="flex-1 card p-5">
          <div className="text-xs font-medium mb-3 italic">Payment details</div>
          <div className="grid grid-cols-2 gap-3 mb-4">
            <PField label="From">
              <select value={contactId} onChange={e => {
                if (e.target.value === '__add__') { setAddingContact(true); return }
                setContactId(e.target.value)
              }}>
                <option value="">Select customer…</option>
                {contacts.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                <option value="__add__">+ Add customer…</option>
              </select>
            </PField>
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
                  <input value={newContactEmail} onChange={e => setNewContactEmail(e.target.value)} placeholder="optional" className="field" style={{ width: 128 }} />
                </div>
                <button onClick={saveNewContact} className="btn btn-sm btn-primary">Save</button>
                <button onClick={() => setAddingContact(false)} className="btn btn-sm btn-ghost">Cancel</button>
              </div>
            )}
            <PField label="Received on">
              <input type="date" value={date} onChange={e => setDate(e.target.value)} />
            </PField>
            <PField label="Amount received">
              <input type="number" step="0.01" value={amount} onChange={e => setAmount(e.target.value)} className="font-mono" placeholder="0.00" />
            </PField>
            <PField label="Into account">
              <select value={bankAccount} onChange={e => setBankAccount(e.target.value)}>
                <option>1000 · FNB Cheque</option>
                <option>1010 · FNB Savings</option>
                <option>1020 · Petty Cash</option>
              </select>
            </PField>
            <PField label="Method">
              <select value={method} onChange={e => setMethod(e.target.value)}>
                {METHODS.map(m => <option key={m}>{m}</option>)}
              </select>
            </PField>
            <PField label="Reference">
              <input value={reference} onChange={e => setReference(e.target.value)} placeholder="e.g. WLW INV103" />
            </PField>
          </div>

          {contactId && (
            <>
              <div className="text-xs font-medium mb-2 italic">Apply to invoices</div>
              <table className="w-full text-xs mb-2">
                <thead>
                  <tr className="border-b border-paper-edge">
                    <th className="py-1.5 w-6" />
                    <th className="py-1.5 text-left font-medium text-ink-2">#</th>
                    <th className="py-1.5 text-left font-medium text-ink-2">Date</th>
                    <th className="py-1.5 text-right font-medium text-ink-2">Owed</th>
                    <th className="py-1.5 text-right font-medium text-ink-2">Applying</th>
                  </tr>
                </thead>
                <tbody>
                  {invoices.map(inv => {
                    const checked = selected.has(inv.id)
                    return (
                      <tr
                        key={inv.id}
                        onClick={() => toggleInvoice(inv.id)}
                        className="cursor-pointer border-b border-paper-edge"
                        style={{ background: checked ? 'var(--accent-soft)' : 'var(--surface)' }}
                      >
                        <td className="py-1.5">
                          <input type="checkbox" checked={checked} readOnly className="cursor-pointer" />
                        </td>
                        <td className="py-1.5 num text-accent">{inv.number}</td>
                        <td className="py-1.5 num text-ink-2">
                          {inv.date ? new Date(inv.date).toLocaleDateString('en-ZA', { day:'2-digit', month:'2-digit', year:'2-digit' }) : '—'}
                        </td>
                        <td className="py-1.5 num font-semibold text-accent">
                          {Number(inv.total).toLocaleString('en-ZA', { minimumFractionDigits: 2 })}
                        </td>
                        <td className="py-1.5 num">
                          {checked ? Number(inv.total).toLocaleString('en-ZA', { minimumFractionDigits: 2 }) : '—'}
                        </td>
                      </tr>
                    )
                  })}
                  {invoices.length === 0 && (
                    <tr><td colSpan={5} className="py-3 text-center text-muted">No outstanding invoices</td></tr>
                  )}
                </tbody>
              </table>
              {amountNum > applying && applying > 0 && (
                <div className="notice notice-accent text-xs italic">
                  over-payment goes to Customer credit (1110)
                </div>
              )}
            </>
          )}
        </div>

        {/* Right: will post */}
        <div className="w-52 shrink-0">
          <div className="card-accent p-4 mb-3">
            <div className="text-xs font-medium mb-2">Will post</div>
            <div className="font-mono space-y-0.5 mb-3 text-ink-2" style={{ fontSize: 11 }}>
              <div>Dr 1000 FNB ........... {amountNum > 0 ? amountNum.toLocaleString('en-ZA', { minimumFractionDigits: 2 }) : '—'}</div>
              <div>Cr 1100 AR — {selectedContact?.name?.split(' ')[0] ?? 'Customer'} . {amountNum > 0 ? amountNum.toLocaleString('en-ZA', { minimumFractionDigits: 2 }) : '—'}</div>
            </div>

            <div className="text-xs font-medium mb-2">After this</div>
            <div className="text-xs space-y-1 mb-4 text-ink-2">
              {selectedInvoices.map(i => (
                <div key={i.id}>{i.number} → <span className="text-positive">Paid</span></div>
              ))}
              <div>{selectedContact?.name?.split(' ')[0] ?? 'Customer'} AR → R {Math.max(0, arBalance - applying).toLocaleString('en-ZA', { minimumFractionDigits: 2 })}</div>
              <div>FNB balance → {amountNum > 0 ? formatMoney(amountNum) : 'R —'}</div>
            </div>

            <Button
              className="w-full"
              size="sm"
              disabled={!contactId || amountNum === 0 || selected.size === 0}
              onClick={() => setSaved(true)}
            >
              Record payment
            </Button>
            {saved && <div className="text-xs mt-2 text-center text-positive">Posted ✓</div>}
            <div className="notice notice-dashed mt-2 text-xs text-center italic">
              auto-matched to FNB bank feed if amount + date agree
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

function PField({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <label className="field-label">{label}</label>
      <div className="field-wrap">{children}</div>
    </div>
  )
}
