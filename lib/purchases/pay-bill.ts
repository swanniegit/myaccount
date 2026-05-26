import type { SupabaseClient } from '@supabase/supabase-js'
import { getAccountId } from '@/lib/livehis-push/account-lookup'
import { recordJournalEntry } from '@/lib/ledger'
import { getDefaultBankAccountId } from '@/lib/banking/get-default-bank'

// DR Accounts Payable / CR Bank
export async function payBill(
  supabase: SupabaseClient,
  billId: string,
  billNumber: string,
  total: number,
  paymentDate: string,
): Promise<void> {
  const [apId, bankId] = await Promise.all([
    getAccountId(supabase, '2000'),
    getDefaultBankAccountId(supabase),
  ])

  const description = `Payment — Bill ${billNumber}`

  const { lines } = await recordJournalEntry(supabase, {
    date: paymentDate,
    description,
    reference: billNumber,
    source: 'payment',
    lines: [
      { account_id: apId,   debit: total, credit: 0,    description: `AP — ${billNumber}` },
      { account_id: bankId, debit: 0,     credit: total, description: `Bank — ${billNumber}` },
    ],
  })

  // G-12: write bank transaction row for reconciliation
  const bankLine = lines.find(l => l.account_id === bankId)
  if (bankLine) {
    const { data: bankAcct } = await supabase
      .from('acct_bank_accounts')
      .select('id')
      .eq('account_id', bankId)
      .maybeSingle()

    if (bankAcct) {
      const { error: btErr } = await supabase.from('acct_bank_transactions').insert({
        bank_account_id: bankAcct.id,
        date:            paymentDate,
        description,
        amount:          -total,
        journal_line_id: bankLine.id,
        reference_type:  'bill_payment',
        reference_id:    billId,
      })
      if (btErr) console.error('Failed to write bank transaction for bill payment:', btErr.message)
    }
  }

  const { error: updateErr } = await supabase
    .from('acct_invoices')
    .update({ status: 'paid' })
    .eq('id', billId)
  if (updateErr) throw new Error(updateErr.message)
}
