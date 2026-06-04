import type { SupabaseClient } from '@supabase/supabase-js'
import type { BankTxnInput } from '@/lib/banking/parse-statement-csv'

export interface ImportStatementInput {
  accountNumber: string
  accountName?: string
  closingBalance?: number | null
  transactions: BankTxnInput[]
}

export interface ImportStatementResult {
  inserted: number
  skipped: number       // duplicates already present in the imported date range
}

const dedupKey = (date: string, amount: number, description: string) =>
  `${date}|${Number(amount).toFixed(2)}|${description.trim()}`

/**
 * Import parsed bank lines into `acct_bank_transactions` for the given account
 * (found by account number, created if absent). De-duplicates against rows
 * already in the imported date range using a (date, amount, description)
 * multiset, so re-importing an overlapping statement is a no-op while genuine
 * same-day/same-amount duplicates are preserved.
 *
 * These rows are unreconciled staging data — GL entries are only created later
 * via the reconcile/allocate flow, never here.
 */
export async function importStatement(
  supabase: SupabaseClient,
  input: ImportStatementInput
): Promise<ImportStatementResult> {
  const { accountNumber, accountName, closingBalance, transactions } = input

  // 1. Find (or create) the bank account for this number.
  let bankAccountId: string
  const { data: existing } = await supabase
    .from('acct_bank_accounts')
    .select('id')
    .eq('account_number', accountNumber)
    .maybeSingle()

  if (existing) {
    bankAccountId = existing.id
  } else {
    const { data: created, error: createErr } = await supabase
      .from('acct_bank_accounts')
      .insert({ name: accountName || `Account ${accountNumber}`, account_number: accountNumber, balance: 0, is_active: true })
      .select('id')
      .single()
    if (createErr || !created) throw new Error(`Could not create bank account: ${createErr?.message ?? 'unknown error'}`)
    bankAccountId = created.id
  }

  // 2. Count-based dedup against existing rows in the imported date range.
  const dates = transactions.map(t => t.date).sort()
  const { data: priorRows, error: priorErr } = await supabase
    .from('acct_bank_transactions')
    .select('date, amount, description')
    .eq('bank_account_id', bankAccountId)
    .gte('date', dates[0])
    .lte('date', dates[dates.length - 1])
  if (priorErr) throw new Error(priorErr.message)

  const seen = new Map<string, number>()
  for (const row of priorRows ?? []) {
    const k = dedupKey(row.date, Number(row.amount), row.description ?? '')
    seen.set(k, (seen.get(k) ?? 0) + 1)
  }

  const toInsert = transactions.filter(t => {
    const k = dedupKey(t.date, t.amount, t.description)
    const remaining = seen.get(k) ?? 0
    if (remaining > 0) { seen.set(k, remaining - 1); return false }
    return true
  })

  // 3. Batch insert the new transactions.
  const BATCH = 100
  let inserted = 0
  for (let i = 0; i < toInsert.length; i += BATCH) {
    const batch = toInsert.slice(i, i + BATCH).map(t => ({
      bank_account_id: bankAccountId,
      date: t.date,
      description: t.description,
      amount: t.amount,
      is_reconciled: false,
      journal_line_id: null,
    }))
    const { error } = await supabase.from('acct_bank_transactions').insert(batch)
    if (error) throw new Error(`Insert failed after ${inserted} rows: ${error.message}`)
    inserted += batch.length
  }

  // 4. Update the account's closing balance if the statement provided one.
  if (typeof closingBalance === 'number') {
    await supabase.from('acct_bank_accounts').update({ balance: closingBalance }).eq('id', bankAccountId)
  }

  return { inserted, skipped: transactions.length - inserted }
}
