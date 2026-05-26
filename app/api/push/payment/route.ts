import { NextRequest, NextResponse } from 'next/server'
import { createServerClient } from '@/lib/supabase-server'
import { recordPaymentJournal } from '@/lib/livehis-push/record-payment-journal'
import type { PushPaymentRequest } from '@/lib/livehis-push/types'
import { requireApiKey } from '@/lib/livehis-push/auth'

export async function POST(req: NextRequest) {
  const authError = requireApiKey(req)
  if (authError) return authError

  let body: PushPaymentRequest
  try {
    body = await req.json()
  } catch {
    return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 })
  }

  const { invoice_external_ref, payment_date, amount, payment_method, reference } = body
  if (!invoice_external_ref || !payment_date || amount == null || !payment_method) {
    return NextResponse.json({ error: 'Missing required fields' }, { status: 400 })
  }

  const supabase = createServerClient()

  const { data: invoice, error: invErr } = await supabase
    .from('acct_invoices')
    .select('id, total, status')
    .eq('external_ref', invoice_external_ref as string)
    .maybeSingle()

  if (invErr) {
    return NextResponse.json({ error: invErr.message }, { status: 500 })
  }
  if (!invoice) {
    return NextResponse.json({ error: 'Invoice not found' }, { status: 404 })
  }

  try {
    await recordPaymentJournal(supabase, {
      payment_date,
      amount,
      invoiceExternalRef: invoice_external_ref,
      reference,
      invoice_id: invoice.id,
    })

    const newStatus = amount >= invoice.total ? 'paid' : invoice.status
    const { error: updateErr } = await supabase
      .from('acct_invoices')
      .update({ status: newStatus })
      .eq('id', invoice.id)

    if (updateErr) {
      throw new Error(`Failed to update invoice status: ${updateErr.message}`)
    }

    return NextResponse.json({ success: true })
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Internal error'
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
