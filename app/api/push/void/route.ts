import { NextRequest, NextResponse } from 'next/server'
import { createServerClient } from '@/lib/supabase-server'
import type { PushVoidRequest } from '@/lib/livehis-push/types'
import { requireApiKey } from '@/lib/livehis-push/auth'
import { recordJournalEntry } from '@/lib/ledger'

export async function POST(req: NextRequest) {
  const authError = requireApiKey(req)
  if (authError) return authError

  let body: PushVoidRequest
  try {
    body = await req.json()
  } catch {
    return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 })
  }

  const { invoice_external_ref } = body
  if (!invoice_external_ref) {
    return NextResponse.json({ error: 'Missing invoice_external_ref' }, { status: 400 })
  }

  const supabase = createServerClient()

  const { data: invoice, error: findErr } = await supabase
    .from('acct_invoices')
    .select('id, number, subtotal, vat_amount, total, journal_entry_id, status')
    .eq('external_ref', invoice_external_ref)
    .maybeSingle()

  if (findErr) return NextResponse.json({ error: findErr.message }, { status: 500 })
  if (!invoice) return NextResponse.json({ error: 'Invoice not found' }, { status: 404 })
  if (invoice.status === 'void') return NextResponse.json({ success: true, already_void: true })

  // Post a reversing journal for the original GL entry before marking void.
  // If the invoice was never posted to the GL (no journal_entry_id), skip the reversal.
  if (invoice.journal_entry_id) {
    const { data: originalLines, error: linesErr } = await supabase
      .from('acct_journal_lines')
      .select('account_id, debit, credit')
      .eq('entry_id', invoice.journal_entry_id)

    if (linesErr) return NextResponse.json({ error: linesErr.message }, { status: 500 })

    if (originalLines && originalLines.length > 0) {
      const today = new Date().toISOString().slice(0, 10)
      try {
        await recordJournalEntry(supabase, {
          date: today,
          description: `Void of invoice ${invoice.number}`,
          reference: `VOID-${invoice.number}`,
          source: 'invoice',
          lines: originalLines.map(l => ({
            account_id: l.account_id,
            debit: Number(l.credit),
            credit: Number(l.debit),
          })),
        })
      } catch (err) {
        return NextResponse.json({ error: (err as Error).message }, { status: 422 })
      }
    }
  }

  const { error: updateErr } = await supabase
    .from('acct_invoices')
    .update({ status: 'void' })
    .eq('id', invoice.id)

  if (updateErr) return NextResponse.json({ error: updateErr.message }, { status: 500 })

  return NextResponse.json({ success: true })
}
