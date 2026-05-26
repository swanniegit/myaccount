'use client'
import { useEffect, useState } from 'react'
import { supabase } from '@/lib/supabase'
import { approveBill } from '@/lib/purchases/approve-bill'
import { payBill } from '@/lib/purchases/pay-bill'
import { today } from '@/lib/utils'
import type { Invoice, InvoiceLine } from '@/lib/types'
import Button from '@/components/ui/Button'
import Badge from '@/components/ui/Badge'

interface Props {
  bill: Invoice
  onUpdated: (bill: Invoice) => void
}

function fmt(d: string) {
  return new Date(d).toLocaleDateString('en-ZA', { day: '2-digit', month: 'short', year: 'numeric' })
}

function DetailRow({ label, value, bold }: { label: string; value: string; bold?: boolean }) {
  return (
    <div className="flex justify-between gap-2 text-xs">
      <span className="t-secondary">{label}</span>
      <span className={`num text-right ${bold ? 'font-semibold' : ''}`}>{value}</span>
    </div>
  )
}

export default function BillDetail({ bill, onUpdated }: Props) {
  const [lines, setLines]           = useState<InvoiceLine[]>([])
  const [saving, setSaving]         = useState(false)
  const [error, setError]           = useState<string | null>(null)
  const [showPayForm, setShowPayForm] = useState(false)
  const [payDate, setPayDate]       = useState(today)

  useEffect(() => {
    setLines([]); setError(null); setShowPayForm(false)
    supabase
      .from('acct_invoice_lines')
      .select('*')
      .eq('invoice_id', bill.id)
      .order('id')
      .then(({ data }) => { if (data) setLines(data as InvoiceLine[]) })
  }, [bill.id])

  async function refresh() {
    const { data } = await supabase
      .from('acct_invoices')
      .select('*, contact:acct_contacts(name)')
      .eq('id', bill.id)
      .single()
    if (data) onUpdated(data as Invoice)
  }

  async function handleApprove() {
    if (lines.length === 0) { setError('No line items found'); return }
    setSaving(true); setError(null)
    try { await approveBill(supabase, { ...bill, lines }); await refresh() }
    catch (e) { setError(e instanceof Error ? e.message : 'Failed to approve') }
    finally { setSaving(false) }
  }

  async function handleReject() {
    setSaving(true); setError(null)
    try { await supabase.from('acct_invoices').update({ status: 'void' }).eq('id', bill.id); await refresh() }
    catch (e) { setError(e instanceof Error ? e.message : 'Failed to reject') }
    finally { setSaving(false) }
  }

  async function handlePay() {
    setSaving(true); setError(null)
    try {
      await payBill(supabase, bill.id, bill.number, Number(bill.total), payDate)
      await refresh(); setShowPayForm(false)
    } catch (e) { setError(e instanceof Error ? e.message : 'Failed to record payment') }
    finally { setSaving(false) }
  }

  const todayStr = today()
  const isOverdue = bill.status === 'sent' && !!bill.due_date && bill.due_date < todayStr

  return (
    <div className="detail-panel w-72">
      <div className="flex items-center justify-between">
        <span className="text-xs font-semibold num">{bill.number}</span>
        <Badge status={isOverdue ? 'overdue' : bill.status} />
      </div>

      <div className="space-y-1.5">
        <div className="flex justify-between gap-2 text-xs">
          <span className="t-secondary">Supplier</span>
          <span className="text-right">{(bill as any).contact?.name ?? '—'}</span>
        </div>
        <div className="flex justify-between gap-2 text-xs">
          <span className="t-secondary">Date</span>
          <span>{fmt(bill.date)}</span>
        </div>
        <div className="flex justify-between gap-2 text-xs">
          <span className="t-secondary">Due</span>
          <span className={isOverdue ? 't-negative font-medium' : ''}>
            {bill.due_date ? fmt(bill.due_date) : '—'}
            {isOverdue && ' ⚠'}
          </span>
        </div>
        <div className="divider pt-2 space-y-1.5">
          <DetailRow label="Excl."  value={`R ${Number(bill.subtotal).toLocaleString('en-ZA', { minimumFractionDigits: 2 })}`} />
          <DetailRow label="VAT"    value={`R ${Number(bill.vat_amount).toLocaleString('en-ZA', { minimumFractionDigits: 2 })}`} />
          <div className="divider pt-1.5 mt-1.5">
            <DetailRow label="Total" value={`R ${Number(bill.total).toLocaleString('en-ZA', { minimumFractionDigits: 2 })}`} bold />
          </div>
        </div>
      </div>

      {lines.length > 0 && (
        <div className="divider pt-2 space-y-1">
          <p className="text-xs font-medium t-secondary mb-1.5">Lines</p>
          {lines.map(l => (
            <div key={l.id} className="flex justify-between gap-2 text-xs">
              <span className="t-secondary truncate">{l.description}</span>
              <span className="num shrink-0">R {Number(l.line_total).toLocaleString('en-ZA', { minimumFractionDigits: 2 })}</span>
            </div>
          ))}
        </div>
      )}

      {bill.notes && <p className="text-xs t-secondary italic">{bill.notes}</p>}

      {error && <p className="t-err">{error}</p>}

      {bill.status === 'draft' && (
        <div className="flex gap-2">
          <Button variant="ghost" size="sm" disabled={saving} onClick={handleReject}>Reject</Button>
          <Button size="sm" disabled={saving} onClick={handleApprove}>
            {saving ? 'Approving…' : 'Approve'}
          </Button>
        </div>
      )}

      {bill.status === 'sent' && !showPayForm && (
        <Button size="sm" onClick={() => setShowPayForm(true)}>Record payment</Button>
      )}

      {bill.status === 'sent' && showPayForm && (
        <div className="flex flex-col gap-2">
          <div>
            <label className="field-label">Payment date</label>
            <input type="date" className="field" value={payDate} onChange={e => setPayDate(e.target.value)} />
          </div>
          <div className="flex gap-2">
            <Button variant="ghost" size="sm" onClick={() => setShowPayForm(false)}>Cancel</Button>
            <Button size="sm" disabled={saving} onClick={handlePay}>
              {saving ? 'Saving…' : 'Confirm payment'}
            </Button>
          </div>
        </div>
      )}
    </div>
  )
}
