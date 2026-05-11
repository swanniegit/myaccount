import type { SupabaseClient } from '@supabase/supabase-js'
import type { InvoiceType } from './types'
import { getAccountId } from './account-lookup'

interface JournalArgs {
  supabase: SupabaseClient
  invoiceNumber: string
  date: string
  invoiceType: InvoiceType
  subtotal: number
  vatAmount: number
  total: number
}

/** Creates a journal entry + lines for an invoice push; returns the entry UUID. */
export async function createInvoiceJournal(args: JournalArgs): Promise<string> {
  const { supabase, invoiceNumber, date, invoiceType, subtotal, vatAmount, total } = args

  // Guard: all amounts must be non-negative for acct_jl_positive constraint.
  // Skip lines that are zero; treat negative amounts as zero to avoid violation.
  const safeTotal    = Math.max(0, total)
  const safeSubtotal = Math.max(0, subtotal)
  const safeVat      = Math.max(0, vatAmount)

  const debitAccountCode = invoiceType === 'cash' ? '1010' : '1100'
  const [debitId, revenueId, vatId] = await Promise.all([
    getAccountId(supabase, debitAccountCode),
    getAccountId(supabase, '4100'),
    getAccountId(supabase, '2100'),
  ])

  const { data: entry, error: entryErr } = await supabase
    .from('acct_journal_entries')
    .insert({
      date,
      description: `Invoice ${invoiceNumber} — liveHis push`,
      reference: invoiceNumber,
      source: 'invoice',
      is_posted: true,
    })
    .select('id')
    .single()

  if (entryErr || !entry) {
    throw new Error(`Failed to create journal entry: ${entryErr?.message ?? 'no row'}`)
  }

  const lines = [
    { entry_id: entry.id, account_id: debitId,   debit: safeTotal,    credit: 0,            description: `AR/Cash — ${invoiceNumber}` },
    { entry_id: entry.id, account_id: revenueId, debit: 0,            credit: safeSubtotal, description: `Revenue — ${invoiceNumber}` },
    { entry_id: entry.id, account_id: vatId,     debit: 0,            credit: safeVat,      description: `VAT Output — ${invoiceNumber}` },
  ]

  const { error: linesErr } = await supabase.from('acct_journal_lines').insert(lines)
  if (linesErr) {
    throw new Error(`Failed to insert journal lines: ${linesErr.message}`)
  }

  return entry.id
}
