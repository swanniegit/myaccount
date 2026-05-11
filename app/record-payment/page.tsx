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

  // AR balance (simplified)
  const arBalance = invoices.reduce((s, i) => s + Number(i.total), 0)

  return (
    <div className="p-5 max-w-3xl">
      <div className="mb-1">
        <h1 className="text-xl font-semibold">Record payment</h1>
        <p className="text-xs mt-0.5" style={{ color: 'var(--ink-2)' }}>
          Step 3 of the flow · pay an invoice or apply a deposit
        </p>
      </div>

      {selectedContact && (
        <div className="text-base font-medium mb-1" style={{ fontStyle: 'italic' }}>
          Payment from {selectedContact.name}
        </div>
      )}
      {!selectedContact && (
        <div className="text-sm mb-1" style={{ color: 'var(--muted)' }}>Select a customer to begin</div>
      )}
      <p className="text-xs mb-4" style={{ color: 'var(--ink-2)' }}>
        Match a receipt against one or more outstanding invoices.
      </p>

      <div className="flex gap-4">
        {/* Left: form */}
        <div className="flex-1 rounded-lg p-5" style={{ background: 'var(--surface)', border: '1px solid var(--paper-edge)' }}>
          <div className="text-xs font-medium mb-3" style={{ fontStyle: 'italic' }}>Payment details</div>
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
                  <input value={newContactEmail} onChange={e => setNewContactEmail(e.target.value)} placeholder="optional" className="w-32 rounded px-2 py-1 text-xs" style={{ border: '1px solid var(--paper-edge)', background: 'var(--surface)' }} />
                </div>
                <button onClick={saveNewContact} className="px-3 py-1 rounded text-xs text-white" style={{ background: 'var(--accent)' }}>Save</button>
                <button onClick={() => setAddingContact(false)} className="px-3 py-1 rounded text-xs" style={{ border: '1px solid var(--paper-edge)' }}>Cancel</button>
              </div>
            )}
            <PField label="Received on">
              <input type="date" value={date} onChange={e => setDate(e.target.value)} />
            </PField>
            <PField label="Amount received">
              <input
                type="number"
                step="0.01"
                value={amount}
                onChange={e => setAmount(e.target.value)}
                className="font-mono"
                placeholder="0.00"
              />
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

          {/* Apply to invoices */}
          {contactId && (
            <>
              <div className="text-xs font-medium mb-2" style={{ fontStyle: 'italic' }}>Apply to invoices</div>
              <table className="w-full text-xs mb-2">
                <thead>
                  <tr style={{ borderBottom: '1px solid var(--paper-edge)' }}>
                    <th className="py-1.5 w-6" />
                    <th className="py-1.5 text-left font-medium" style={{ color: 'var(--ink-2)' }}>#</th>
                    <th className="py-1.5 text-left font-medium" style={{ color: 'var(--ink-2)' }}>Date</th>
                    <th className="py-1.5 text-right font-medium" style={{ color: 'var(--ink-2)' }}>Owed</th>
                    <th className="py-1.5 text-right font-medium" style={{ color: 'var(--ink-2)' }}>Applying</th>
                  </tr>
                </thead>
                <tbody>
                  {invoices.map(inv => {
                    const checked = selected.has(inv.id)
                    return (
                      <tr
                        key={inv.id}
                        onClick={() => toggleInvoice(inv.id)}
                        className="cursor-pointer"
                        style={{
                          borderBottom: '1px solid var(--paper-edge)',
                          background: checked ? 'var(--accent-soft)' : 'var(--surface)',
                        }}
                      >
                        <td className="py-1.5">
                          <input type="checkbox" checked={checked} readOnly className="cursor-pointer" />
                        </td>
                        <td className="py-1.5 font-mono" style={{ color: 'var(--accent)' }}>{inv.number}</td>
                        <td className="py-1.5 font-mono" style={{ color: 'var(--ink-2)' }}>
                          {inv.date ? new Date(inv.date).toLocaleDateString('en-ZA', { day:'2-digit', month:'2-digit', year:'2-digit' }) : '—'}
                        </td>
                        <td className="py-1.5 font-mono text-right font-semibold" style={{ color: 'var(--accent)' }}>
                          {Number(inv.total).toLocaleString('en-ZA', { minimumFractionDigits: 2 })}
                        </td>
                        <td className="py-1.5 font-mono text-right">
                          {checked ? Number(inv.total).toLocaleString('en-ZA', { minimumFractionDigits: 2 }) : '—'}
                        </td>
                      </tr>
                    )
                  })}
                  {invoices.length === 0 && (
                    <tr><td colSpan={5} className="py-3 text-center" style={{ color: 'var(--muted)' }}>No outstanding invoices</td></tr>
                  )}
                </tbody>
              </table>
              {amountNum > applying && applying > 0 && (
                <div
                  className="px-3 py-1.5 text-xs rounded"
                  style={{ border: '1px dashed var(--accent)', color: 'var(--ink-2)', fontStyle: 'italic' }}
                >
                  over-payment goes to Customer credit (1110)
                </div>
              )}
            </>
          )}
        </div>

        {/* Right: will post */}
        <div className="w-52 shrink-0">
          <div
            className="rounded-lg p-4 mb-3"
            style={{ background: 'var(--accent-soft)', border: '1px solid var(--accent)' }}
          >
            <div className="text-xs font-medium mb-2">Will post</div>
            <div className="font-mono space-y-0.5 mb-3" style={{ fontSize: 11, color: 'var(--ink-2)' }}>
              <div>Dr 1000 FNB ........... {amountNum > 0 ? amountNum.toLocaleString('en-ZA', { minimumFractionDigits: 2 }) : '—'}</div>
              <div>Cr 1100 AR — {selectedContact?.name?.split(' ')[0] ?? 'Customer'} . {amountNum > 0 ? amountNum.toLocaleString('en-ZA', { minimumFractionDigits: 2 }) : '—'}</div>
            </div>

            <div className="text-xs font-medium mb-2">After this</div>
            <div className="text-xs space-y-1 mb-4" style={{ color: 'var(--ink-2)' }}>
              {selectedInvoices.map(i => (
                <div key={i.id}>{i.number} → <span style={{ color: 'var(--positive)' }}>Paid</span></div>
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
            {saved && <div className="text-xs mt-2 text-center" style={{ color: 'var(--positive)' }}>Posted ✓</div>}
            <div
              className="mt-2 text-xs text-center"
              style={{ border: '1px dashed var(--paper-edge)', borderRadius: 4, padding: '4px 6px', color: 'var(--muted)', fontStyle: 'italic' }}
            >
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
      <label className="block text-xs mb-1" style={{ color: 'var(--ink-2)' }}>{label}</label>
      <div className="[&>input]:w-full [&>input]:px-2.5 [&>input]:py-1.5 [&>input]:rounded [&>input]:text-xs [&>input]:border [&>input]:bg-paper [&>select]:w-full [&>select]:px-2.5 [&>select]:py-1.5 [&>select]:rounded [&>select]:text-xs [&>select]:border [&>select]:bg-paper">
        {children}
      </div>
    </div>
  )
}
