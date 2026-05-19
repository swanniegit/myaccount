import type { SupabaseClient } from '@supabase/supabase-js'
import { recordJournalEntry } from '@/lib/ledger'

export interface AllocateBankTransactionInput {
  bank_transaction_id: string
  account_id: string
  description?: string
}

export interface AllocateBankTransactionResult {
  journal_entry_id: string
}

export async function allocateBankTransaction(
  supabase: SupabaseClient,
  input: AllocateBankTransactionInput
): Promise<AllocateBankTransactionResult> {
  const { bank_transaction_id, account_id, description } = input

  const { data: txn, error: txnError } = await supabase
    .from('acct_bank_transactions')
    .select('id, date, description, amount, bank_account_id, acct_bank_accounts(account_id)')
    .eq('id', bank_transaction_id)
    .single()

  if (txnError || !txn) throw new Error('Transaction not found')

  const bankAcct = Array.isArray(txn.acct_bank_accounts)
    ? txn.acct_bank_accounts[0]
    : txn.acct_bank_accounts
  const bankGlAccountId = (bankAcct as { account_id: string | null } | null)?.account_id
  if (!bankGlAccountId) throw new Error('Bank account has no GL account linked')

  const amt = Math.abs(Number(txn.amount))
  const isDeposit = Number(txn.amount) > 0
  const entryDescription = description || txn.description

  const lines = isDeposit
    ? [
        { account_id: bankGlAccountId, debit: amt, credit: 0, description: entryDescription },
        { account_id, debit: 0, credit: amt, description: entryDescription },
      ]
    : [
        { account_id, debit: amt, credit: 0, description: entryDescription },
        { account_id: bankGlAccountId, debit: 0, credit: amt, description: entryDescription },
      ]

  const { entry, lines: postedLines } = await recordJournalEntry(supabase, {
    date: txn.date,
    description: entryDescription,
    source: 'bank_import',
    lines,
  })

  const bankLine = postedLines.find(l => l.account_id === bankGlAccountId)

  const { error: linkError } = await supabase
    .from('acct_bank_transactions')
    .update({
      journal_line_id: bankLine?.id ?? postedLines[0]?.id,
      is_reconciled: true,
    })
    .eq('id', bank_transaction_id)

  if (linkError) throw new Error(linkError.message)

  return { journal_entry_id: entry.id }
}
