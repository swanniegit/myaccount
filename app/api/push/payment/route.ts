import { NextRequest, NextResponse } from 'next/server'
import { createServerClient } from '@/lib/supabase-server'
import { getAccountId } from '@/lib/livehis-push/account-lookup'
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
    .eq('external_ref', invoice_external_ref)
    .maybeSingle()

  if (invErr) {
    return NextResponse.json({ error: invErr.message }, { status: 500 })
  }
  if (!invoice) {
    return NextResponse.json({ error: 'Invoice not found' }, { status: 404 })
  }

  try {
    // DR 1010 (bank), CR 1100 (AR) for all payment methods
    const [bankId, arId] = await Promise.all([
      getAccountId(supabase, '1010'),
      getAccountId(supabase, '1100'),
    ])

    const description = `Payment for invoice ${invoice_external_ref}${reference ? ` — ${reference}` : ''}`

    const { data: entry, error: entryErr } = await supabase
      .from('acct_journal_entries')
      .insert({
        date: payment_date,
        description,
        reference: reference ?? null,
        source: 'invoice',
        is_posted: true,
      })
      .select('id')
      .single()

    if (entryErr || !entry) {
      throw new Error(`Failed to create payment journal: ${entryErr?.message ?? 'no row'}`)
    }

    const { error: linesErr } = await supabase.from('acct_journal_lines').insert([
      { entry_id: entry.id, account_id: bankId, debit: amount, credit: 0,      description },
      { entry_id: entry.id, account_id: arId,   debit: 0,      credit: amount, description },
    ])
    if (linesErr) {
      throw new Error(`Failed to insert payment journal lines: ${linesErr.message}`)
    }

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
