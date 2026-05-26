import type { SupabaseClient } from '@supabase/supabase-js'
import { getAccountId } from './account-lookup'
import { recordJournalEntry } from '@/lib/ledger'

/** DR Bank / CR Accounts Receivable for an invoice payment.
 *  Also writes an acct_bank_transactions row for bank reconciliation (G-12). */
export async function recordPaymentJournal(
  supabase: SupabaseClient,
  opts: {
    payment_date: string
    amount: number
    invoiceExternalRef: string
    reference?: string | null
    invoice_id?: string | null
  }
): Promise<string> {
  const [bankId, arId] = await Promise.all([
    getAccountId(supabase, '1010'),
    getAccountId(supabase, '1100'),
  ])

  const description = `Payment for invoice ${opts.invoiceExternalRef}${
    opts.reference ? ` — ${opts.reference}` : ''
  }`

  const { entry, lines } = await recordJournalEntry(supabase, {
    date: opts.payment_date,
    description,
    reference: opts.reference ?? undefined,
    source: 'invoice',
    lines: [
      { account_id: bankId, debit: opts.amount, credit: 0, description },
      { account_id: arId,   debit: 0, credit: opts.amount, description },
    ],
  })

  // G-12: write bank transaction row so the payment appears in bank reconciliation
  const bankLine = lines.find(l => l.account_id === bankId)
  if (bankLine) {
    const { data: bankAcct } = await supabase
      .from('acct_bank_accounts')
      .select('id')
      .eq('account_id', bankId)
      .maybeSingle()

    if (bankAcct) {
      await supabase.from('acct_bank_transactions').insert({
        bank_account_id: bankAcct.id,
        date:            opts.payment_date,
        description,
        amount:          opts.amount,
        journal_line_id: bankLine.id,
        reference_type:  'invoice_payment',
        reference_id:    opts.invoice_id ?? null,
      })
    }
  }

  return entry.id
}
