'use client'
import { useState } from 'react'
import { supabase } from '@/lib/supabase'
import { createBill } from '@/lib/purchases/create-bill'
import { today } from '@/lib/utils'
import type { BillLineInput } from '@/lib/purchases/types'
import BillLineEditor from './BillLineEditor'
import SupplierSelect from './SupplierSelect'
import Button from '@/components/ui/Button'

interface Props {
  open: boolean
  onClose: () => void
  onCreated: () => void
}

function genBillNumber() {
  const d = new Date()
  const ymd = `${d.getFullYear()}${String(d.getMonth() + 1).padStart(2, '0')}${String(d.getDate()).padStart(2, '0')}`
  return `BILL-${ymd}-${String(d.getHours() * 60 + d.getMinutes()).padStart(4, '0')}`
}

export default function NewBillSheet({ open, onClose, onCreated }: Props) {
  const [contactId, setContactId] = useState('')
  const [number, setNumber]       = useState(genBillNumber)
  const [date, setDate]           = useState(today)
  const [dueDate, setDueDate]     = useState('')
  const [notes, setNotes]         = useState('')
  const [lines, setLines]         = useState<BillLineInput[]>([])
  const [saving, setSaving]       = useState(false)
  const [error, setError]         = useState<string | null>(null)

  const subtotal  = lines.reduce((s, l) => s + l.line_total, 0)
  const vatAmount = lines.reduce((s, l) => s + Math.round(l.line_total * l.vat_rate) / 100, 0)
  const total     = subtotal + vatAmount

  function resetForm() {
    setContactId(''); setNumber(genBillNumber()); setDate(today())
    setDueDate(''); setNotes(''); setLines([]); setError(null)
  }

  async function handleSave() {
    if (!contactId)           { setError('Select a supplier'); return }
    if (!number.trim())       { setError('Bill number is required'); return }
    if (lines.length === 0)   { setError('Add at least one line item'); return }
    if (lines.some(l => !l.account_id))           { setError('Select an account for every line'); return }
    if (lines.every(l => l.line_total === 0))     { setError('At least one line must have a value'); return }

    setSaving(true); setError(null)
    try {
      await createBill(supabase, { number: number.trim(), contact_id: contactId, date, due_date: dueDate || null, notes: notes || null, lines })
      resetForm(); onCreated(); onClose()
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to save')
    } finally { setSaving(false) }
  }

  if (!open) return null

  return (
    <>
      <div className="sheet-overlay" onClick={onClose} />

      <div className="sheet-panel" style={{ width: 660 }}>
        <div className="sheet-header">
          <h2 className="text-sm font-semibold">New bill</h2>
          <button onClick={onClose} className="text-sm opacity-50 hover:opacity-100 t-secondary">✕</button>
        </div>

        <div className="sheet-body">
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="field-label">Supplier *</label>
              <SupplierSelect value={contactId} onChange={setContactId} />
            </div>
            <div>
              <label className="field-label">Bill number *</label>
              <input className="field" value={number} onChange={e => setNumber(e.target.value)} />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="field-label">Bill date *</label>
              <input type="date" className="field" value={date} onChange={e => setDate(e.target.value)} />
            </div>
            <div>
              <label className="field-label">Due date</label>
              <input type="date" className="field" value={dueDate} onChange={e => setDueDate(e.target.value)} />
            </div>
          </div>

          <div>
            <label className="field-label mb-2">Line items</label>
            <BillLineEditor lines={lines} onChange={setLines} />
          </div>

          <div className="ml-auto text-xs space-y-1.5" style={{ width: 220 }}>
            <div className="flex justify-between">
              <span className="t-secondary">Subtotal (excl. VAT)</span>
              <span className="num">R {subtotal.toLocaleString('en-ZA', { minimumFractionDigits: 2 })}</span>
            </div>
            <div className="flex justify-between">
              <span className="t-secondary">VAT</span>
              <span className="num">R {vatAmount.toLocaleString('en-ZA', { minimumFractionDigits: 2 })}</span>
            </div>
            <div className="flex justify-between font-semibold pt-1.5 divider">
              <span>Total</span>
              <span className="num">R {total.toLocaleString('en-ZA', { minimumFractionDigits: 2 })}</span>
            </div>
          </div>

          <div>
            <label className="field-label">Notes</label>
            <textarea className="field" rows={2} value={notes} onChange={e => setNotes(e.target.value)} placeholder="Reference number, supplier invoice #, etc." style={{ resize: 'none' }} />
          </div>

          {error && <p className="t-err">{error}</p>}
        </div>

        <div className="sheet-footer">
          <Button variant="ghost" size="sm" onClick={onClose}>Cancel</Button>
          <Button size="sm" disabled={saving} onClick={handleSave}>
            {saving ? 'Saving…' : 'Save as draft'}
          </Button>
        </div>
      </div>
    </>
  )
}
