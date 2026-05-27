import type { SupabaseClient } from '@supabase/supabase-js'
import { recordJournalEntry } from '@/lib/ledger'
import type { JournalLineInput } from '@/lib/ledger'
import { getAccountId } from '@/lib/livehis-push/account-lookup'
import { round2 } from '@/lib/utils'

export interface CreditNoteInput {
  date: string
  description: string
  reference?: string | null    // original invoice number, if any
  revenueAccountId: string
  subtotal: number             // excl VAT
  vat: number
}

/**
 * Pure: build the reversing journal lines for a credit note.
 * Reverses a sale — Dr Revenue, Dr VAT Output, Cr Accounts Receivable.
 */
export function buildCreditNoteLines(opts: {
  revenueAccountId: string
  arAccountId: string
  vatAccountId: string
  subtotal: number
  vat: number
  reference?: string | null
}): JournalLineInput[] {
  const subtotal = round2(opts.subtotal)
  const vat = round2(opts.vat)
  const total = round2(subtotal + vat)
  const ref = opts.reference ? ` — ${opts.reference}` : ''

  const lines: JournalLineInput[] = [
    { account_id: opts.revenueAccountId, debit: subtotal, credit: 0, description: `Credit note — revenue${ref}`, tax_type_code: '01' },
  ]
  if (vat > 0) {
    lines.push({ account_id: opts.vatAccountId, debit: vat, credit: 0, description: `Credit note — VAT output reversal${ref}`, tax_type_code: '01' })
  }
  lines.push({ account_id: opts.arAccountId, debit: 0, credit: total, description: `Credit note — AR${ref}` })
  return lines
}

/** Post a credit note as a reversing journal entry (source 'invoice' clears the control-account guard). */
export async function postCreditNote(
  supabase: SupabaseClient,
  input: CreditNoteInput,
): Promise<{ entryId: string; journalNumber: number | null; total: number }> {
  const subtotal = round2(input.subtotal)
  const vat = round2(input.vat)
  const total = round2(subtotal + vat)
  if (total <= 0) throw new Error('Credit note amount must be greater than zero')

  const [arAccountId, vatAccountId] = await Promise.all([
    getAccountId(supabase, '1100'),
    getAccountId(supabase, '2100'),
  ])

  const lines = buildCreditNoteLines({
    revenueAccountId: input.revenueAccountId,
    arAccountId,
    vatAccountId,
    subtotal,
    vat,
    reference: input.reference,
  })

  const ref = input.reference ? ` — ${input.reference}` : ''
  const { entry } = await recordJournalEntry(supabase, {
    date: input.date,
    description: `Credit Note${ref}: ${input.description}`,
    reference: input.reference ?? undefined,
    source: 'invoice',
    lines,
  })
  return { entryId: entry.id, journalNumber: entry.journal_number, total }
}
