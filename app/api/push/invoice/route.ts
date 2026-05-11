import { NextRequest, NextResponse } from 'next/server'
import { createServerClient } from '@/lib/supabase-server'
import { upsertContact } from '@/lib/livehis-push/upsert-contact'
import { createInvoiceJournal } from '@/lib/livehis-push/create-invoice-journal'
import type { PushInvoiceRequest } from '@/lib/livehis-push/types'
import { getAccountId } from '@/lib/livehis-push/account-lookup'

export async function POST(req: NextRequest) {
  let body: PushInvoiceRequest
  try {
    body = await req.json()
  } catch {
    return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 })
  }

  const { invoice, contact, lines } = body
  if (!invoice?.external_ref || !invoice?.number || !contact?.external_ref) {
    return NextResponse.json({ error: 'Missing required fields' }, { status: 400 })
  }

  const supabase = createServerClient()

  // Idempotency: return early if already pushed
  const { data: existing } = await supabase
    .from('acct_invoices')
    .select('id')
    .eq('external_ref', invoice.external_ref)
    .maybeSingle()

  if (existing) {
    return NextResponse.json({ success: true, invoice_id: existing.id, duplicate: true })
  }

  try {
    const contactId = await upsertContact(supabase, contact)

    const journalEntryId = await createInvoiceJournal({
      supabase,
      invoiceNumber: invoice.number,
      date: invoice.date,
      invoiceType: invoice.invoice_type,
      subtotal: invoice.subtotal,
      vatAmount: invoice.vat_amount,
      total: invoice.total,
    })

    const { data: newInvoice, error: invErr } = await supabase
      .from('acct_invoices')
      .insert({
        number: invoice.number,
        contact_id: contactId,
        date: invoice.date,
        due_date: invoice.due_date ?? null,
        status: 'sent',
        subtotal: invoice.subtotal,
        vat_amount: invoice.vat_amount,
        total: invoice.total,
        notes: invoice.notes ?? null,
        journal_entry_id: journalEntryId,
        external_ref: invoice.external_ref,
      })
      .select('id')
      .single()

    if (invErr || !newInvoice) {
      throw new Error(`Failed to insert invoice: ${invErr?.message ?? 'no row'}`)
    }

    const revenueAccountId = await getAccountId(supabase, '4100')
    const invoiceLines = lines.map((l) => ({
      invoice_id: newInvoice.id,
      description: l.description,
      quantity: l.quantity,
      unit_price: l.unit_price,
      vat_rate: l.vat_rate,
      account_id: revenueAccountId,
      line_total: l.line_total,
    }))

    const { error: linesErr } = await supabase.from('acct_invoice_lines').insert(invoiceLines)
    if (linesErr) {
      throw new Error(`Failed to insert invoice lines: ${linesErr.message}`)
    }

    return NextResponse.json({ success: true, invoice_id: newInvoice.id })
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Internal error'
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
