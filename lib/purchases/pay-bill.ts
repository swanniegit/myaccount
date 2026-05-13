import type { SupabaseClient } from '@supabase/supabase-js'
import { getAccountId } from '@/lib/livehis-push/account-lookup'

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

  const { data: entry, error: entryErr } = await supabase
    .from('acct_journal_entries')
    .insert({
      date: paymentDate,
      description: `Payment — Bill ${billNumber}`,
      reference: billNumber,
      source: 'bill',
      is_posted: true,
    })
    .select('id')
    .single()

  if (entryErr || !entry) throw new Error(entryErr?.message ?? 'Failed to create payment journal')

  const { error: linesErr } = await supabase.from('acct_journal_lines').insert([
    { entry_id: entry.id, account_id: apId,   debit: total, credit: 0,     description: `AP — ${billNumber}` },
    { entry_id: entry.id, account_id: bankId, debit: 0,     credit: total, description: `Bank — ${billNumber}` },
  ])
  if (linesErr) throw new Error(linesErr.message)

  const { error: updateErr } = await supabase
    .from('acct_invoices')
    .update({ status: 'paid' })
    .eq('id', billId)
  if (updateErr) throw new Error(updateErr.message)
}
