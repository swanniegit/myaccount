import type { SupabaseClient } from '@supabase/supabase-js'
import type { BankTxnInput } from '@/lib/banking/parse-statement-csv'

export interface ImportStatementInput {
  bankAccountId: string
  statementAccountNumber?: string | null   // from the CSV; verified against the target account
  closingBalance?: number | null
  transactions: BankTxnInput[]
}

export interface ImportStatementResult {
  inserted: number
  skipped: number       // duplicates already present in the imported date range
}

const PAGE = 1000

const dedupKey = (date: string, amount: number, description: string) =>
  `${date}|${Number(amount).toFixed(2)}|${description.trim()}`

/**
 * Import parsed bank lines into `acct_bank_transactions` for an existing
 * account (identified by id — never created here, so reconciliation never
 * meets an account with no GL link). The statement's own account number is
 * verified against the target server-side.
 *
 * De-duplicates against rows already in the imported date range using a
 * (date, amount, description) multiset, so re-importing an overlapping
 * statement is a no-op while genuine same-day/same-amount duplicates are
 * preserved. The existing-rows query is paginated to stay correct past 1000.
 *
 * These rows are unreconciled staging data — GL entries are only created later
 * via the reconcile/allocate flow, never here.
 */
export async function importStatement(
  supabase: SupabaseClient,
  input: ImportStatementInput
): Promise<ImportStatementResult> {
  const { bankAccountId, statementAccountNumber, closingBalance, transactions } = input

  // 1. Resolve the target account (must already exist) and verify the file matches it.
  const { data: account, error: acctErr } = await supabase
    .from('acct_bank_accounts')
    .select('id, account_number')
    .eq('id', bankAccountId)
    .maybeSingle()
  if (acctErr) throw new Error(acctErr.message)
  if (!account) throw new Error('Bank account not found')
  if (statementAccountNumber && account.account_number && statementAccountNumber !== account.account_number) {
    throw new Error(`Statement is for account ${statementAccountNumber}, not ${account.account_number}`)
  }

  // 2. Load existing rows in the imported date range (paginated) for count-based dedup.
  const dates = transactions.map(t => t.date).sort()
  const minDate = dates[0]
  const maxDate = dates[dates.length - 1]
  const seen = new Map<string, number>()
  for (let from = 0; ; from += PAGE) {
    const { data: rows, error } = await supabase
      .from('acct_bank_transactions')
      .select('date, amount, description')
      .eq('bank_account_id', bankAccountId)
      .gte('date', minDate)
      .lte('date', maxDate)
      .order('date', { ascending: true })
      .range(from, from + PAGE - 1)
    if (error) throw new Error(error.message)
    for (const row of rows ?? []) {
      const k = dedupKey(row.date, Number(row.amount), row.description ?? '')
      seen.set(k, (seen.get(k) ?? 0) + 1)
    }
    if (!rows || rows.length < PAGE) break
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
