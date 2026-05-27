'use client'
import { useState, useEffect } from 'react'
import Link from 'next/link'
import { supabase } from '@/lib/supabase'
import { postCreditNote } from '@/lib/sales/create-credit-note'
import { calcVAT, formatMoney, today } from '@/lib/utils'
import type { Contact, Account } from '@/lib/types'
import Button from '@/components/ui/Button'

export default function CreditNotePage() {
  const [contacts, setContacts]   = useState<Contact[]>([])
  const [accounts, setAccounts]   = useState<Account[]>([])
  const [contactId, setContactId] = useState('')
  const [date, setDate]           = useState(today())
  const [reference, setReference] = useState('')
  const [revenueAccountId, setRevenueAccountId] = useState('')
  const [amount, setAmount]       = useState('')
  const [applyVat, setApplyVat]   = useState(true)
  const [description, setDescription] = useState('')
  const [saving, setSaving]       = useState(false)
  const [error, setError]         = useState('')
  const [done, setDone]           = useState<string | null>(null)

  useEffect(() => {
    supabase.from('acct_contacts').select('*').in('type', ['customer', 'both']).eq('is_active', true).order('name')
      .then(({ data }) => { if (data) setContacts(data) })
    supabase.from('acct_accounts').select('*').eq('type', 'revenue').eq('is_active', true).order('code')
      .then(({ data }) => { if (data) { setAccounts(data); if (data[0]) setRevenueAccountId(data[0].id) } })
  }, [])

  const subtotal = parseFloat(amount) || 0
  const vat      = applyVat ? calcVAT(subtotal) : 0
  const total    = subtotal + vat
  const customer = contacts.find(c => c.id === contactId)
  const revenue  = accounts.find(a => a.id === revenueAccountId)

  async function post() {
    if (!contactId) { setError('Select a customer.'); return }
    if (total <= 0) { setError('Enter an amount greater than zero.'); return }
    setSaving(true); setError(''); setDone(null)
    try {
      const desc = `${customer ? customer.name : 'Customer'}${description ? ' — ' + description : ''}`
      const { journalNumber } = await postCreditNote(supabase, {
        date, description: desc, reference: reference || null, revenueAccountId, subtotal, vat,
      })
      setDone(`Posted credit note JE-${journalNumber ?? '—'} · ${formatMoney(total)} reversed.`)
      setAmount(''); setReference(''); setDescription('')
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e))
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="p-5 max-w-3xl">
      <div className="mb-4">
        <Link href="/customers" className="text-xs text-accent hover:underline">← Customers</Link>
        <h1 className="text-xl font-semibold mt-1">Credit Note</h1>
        <p className="text-xs mt-0.5 text-ink-2">Reverses revenue + VAT and reduces Accounts Receivable</p>
      </div>

      <div className="flex gap-4">
        <div className="flex-1 card p-5">
          <div className="grid grid-cols-2 gap-3 mb-4">
            <div>
              <label className="field-label">Customer</label>
              <select className="field" value={contactId} onChange={e => setContactId(e.target.value)}>
                <option value="">Select customer…</option>
                {contacts.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
              </select>
            </div>
            <div>
              <label className="field-label">Against invoice (optional)</label>
              <input type="text" className="field" value={reference} onChange={e => setReference(e.target.value)} placeholder="e.g. INV-001" />
            </div>
            <div>
              <label className="field-label">Date</label>
              <input type="date" className="field" value={date} onChange={e => setDate(e.target.value)} />
            </div>
            <div>
              <label className="field-label">Revenue account</label>
              <select className="field" value={revenueAccountId} onChange={e => setRevenueAccountId(e.target.value)}>
                {accounts.map(a => <option key={a.id} value={a.id}>{a.code} · {a.name}</option>)}
              </select>
            </div>
            <div>
              <label className="field-label">Amount (excl VAT)</label>
              <input type="number" step="0.01" className="field num" value={amount} onChange={e => setAmount(e.target.value)} placeholder="0.00" />
            </div>
            <div>
              <label className="field-label">VAT</label>
              <label className="flex items-center gap-2 text-xs mt-1.5">
                <input type="checkbox" checked={applyVat} onChange={e => setApplyVat(e.target.checked)} />
                Apply VAT (15%)
              </label>
            </div>
            <div className="col-span-2">
              <label className="field-label">Reason / description</label>
              <input type="text" className="field" value={description} onChange={e => setDescription(e.target.value)} placeholder="e.g. returned goods, billing error" />
            </div>
          </div>

          <Button size="sm" onClick={post} disabled={saving || total <= 0 || !revenueAccountId || !contactId}>
            {saving ? 'Posting…' : 'Post credit note'}
          </Button>
          {error && <p className="text-xs mt-2 text-negative">{error}</p>}
          {done && <p className="text-xs mt-2 text-positive">{done}</p>}
        </div>

        <div className="w-56 shrink-0">
          <div className="card p-4 mb-3">
            <div className="text-xs font-medium mb-3">Totals</div>
            <Row label="Subtotal" v={subtotal} />
            <Row label="VAT (15%)" v={vat} />
            <div className="flex justify-between text-sm font-semibold pt-2 mt-2" style={{ borderTop: '1px solid var(--paper-edge)' }}>
              <span>Credit total</span>
              <span className="num text-accent">{total > 0 ? formatMoney(total) : '—'}</span>
            </div>
          </div>

          {total > 0 && (
            <div className="rounded-lg p-4 bg-paper border border-paper-edge">
              <div className="text-xs font-medium mb-2">Will post</div>
              <div className="num space-y-0.5 text-ink-2" style={{ fontSize: 11 }}>
                <div>Dr {revenue?.code ?? '4xxx'} {revenue?.name?.split(' ')[0] ?? 'Rev'} .. {subtotal.toLocaleString('en-ZA', { minimumFractionDigits: 2 })}</div>
                {vat > 0 && <div>Dr 2100 VAT Out .. {vat.toLocaleString('en-ZA', { minimumFractionDigits: 2 })}</div>}
                <div>Cr 1100 AR ........ {total.toLocaleString('en-ZA', { minimumFractionDigits: 2 })}</div>
              </div>
            </div>
          )}

          <div className="notice notice-dashed mt-3" style={{ fontSize: 11 }}>
            Posts to the GL and reduces total AR. Allocation to a specific customer/invoice isn’t modelled yet.
          </div>
        </div>
      </div>
    </div>
  )
}

function Row({ label, v }: { label: string; v: number }) {
  return (
    <div className="flex justify-between text-xs mb-1.5">
      <span className="text-ink-2">{label}</span>
      <span className="num">{v > 0 ? v.toLocaleString('en-ZA', { minimumFractionDigits: 2 }) : '—'}</span>
    </div>
  )
}
