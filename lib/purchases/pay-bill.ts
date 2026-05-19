import type { SupabaseClient } from '@supabase/supabase-js'
import { getAccountId } from '@/lib/livehis-push/account-lookup'
import { recordJournalEntry } from '@/lib/ledger'

// DR Accounts Payable / CR Bank
export async function payBill(
  supabase: SupabaseClient,
  billId: string,
  billNumber: string,
  total: number,
  paymentDate: string,
  bankCode = '1010'
): Promise<void> {
  const [apId, bankId] = await Promise.all([
    getAccountId(supabase, '2000'),
    getAccountId(supabase, bankCode),
  ])

  await recordJournalEntry(supabase, {
    date: paymentDate,
    description: `Payment — Bill ${billNumber}`,
    reference: billNumber,
    source: 'bill',
    lines: [
      { account_id: apId, debit: total, credit: 0, description: `AP — ${billNumber}` },
      { account_id: bankId, debit: 0, credit: total, description: `Bank — ${billNumber}` },
    ],
  })

  const { error: updateErr } = await supabase
    .from('acct_invoices')
    .update({ status: 'paid' })
    .eq('id', billId)
  if (updateErr) throw new Error(updateErr.message)
}
