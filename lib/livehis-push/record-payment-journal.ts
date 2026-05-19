import type { SupabaseClient } from '@supabase/supabase-js'
import { getAccountId } from './account-lookup'
import { recordJournalEntry } from '@/lib/ledger'

/** DR Bank / CR Accounts Receivable for an invoice payment. */
export async function recordPaymentJournal(
  supabase: SupabaseClient,
  opts: {
    payment_date: string
    amount: number
    invoiceExternalRef: string
    reference?: string | null
  }
): Promise<string> {
  const [bankId, arId] = await Promise.all([
    getAccountId(supabase, '1010'),
    getAccountId(supabase, '1100'),
  ])

  const description = `Payment for invoice ${opts.invoiceExternalRef}${
    opts.reference ? ` — ${opts.reference}` : ''
  }`

  const { entry } = await recordJournalEntry(supabase, {
    date: opts.payment_date,
    description,
    reference: opts.reference ?? undefined,
    source: 'invoice',
    lines: [
      { account_id: bankId, debit: opts.amount, credit: 0, description },
      { account_id: arId, debit: 0, credit: opts.amount, description },
    ],
  })

  return entry.id
}
