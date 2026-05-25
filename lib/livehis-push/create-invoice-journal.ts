import type { SupabaseClient } from '@supabase/supabase-js'
import type { InvoiceType } from './types'
import { getAccountId } from './account-lookup'
import { recordJournalEntry } from '@/lib/ledger'

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

  const safeTotal = Math.max(0, total)
  const safeSubtotal = Math.max(0, subtotal)
  const safeVat = Math.max(0, vatAmount)

  const debitAccountCode = invoiceType === 'cash' ? '1010' : '1100'
  const [debitId, revenueId, vatId] = await Promise.all([
    getAccountId(supabase, debitAccountCode),
    getAccountId(supabase, '4100'),
    getAccountId(supabase, '2100'),
  ])

  const { entry } = await recordJournalEntry(supabase, {
    date,
    description: `Invoice ${invoiceNumber} — liveHis push`,
    reference: invoiceNumber,
    source: 'invoice',
    lines: [
      {
        account_id: debitId,
        debit: safeTotal,
        credit: 0,
        description: `AR/Cash — ${invoiceNumber}`,
      },
      {
        account_id: revenueId,
        debit: 0,
        credit: safeSubtotal,
        description: `Revenue — ${invoiceNumber}`,
        tax_type_code: '01',
      },
      {
        account_id: vatId,
        debit: 0,
        credit: safeVat,
        description: `VAT Output — ${invoiceNumber}`,
        tax_type_code: '01',
      },
    ],
  })

  return entry.id
}
