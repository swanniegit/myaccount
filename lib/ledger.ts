import { supabase } from './supabase'
import type { Account, AccountType } from './types'

export interface RecordEntryInput {
  date: string
  description: string
  reference?: string
  source?: 'manual' | 'bank_import' | 'invoice' | 'bill'
  lines: {
    account_id: string
    debit: number
    credit: number
    description?: string
  }[]
}

export async function recordJournalEntry(input: RecordEntryInput) {
  const totalDebits = input.lines.reduce((s, l) => s + (l.debit || 0), 0)
  const totalCredits = input.lines.reduce((s, l) => s + (l.credit || 0), 0)

  if (Math.abs(totalDebits - totalCredits) > 0.001) {
    throw new Error(
      `Debits (R ${totalDebits.toFixed(2)}) must equal Credits (R ${totalCredits.toFixed(2)})`
    )
  }

  const { data: entry, error: entryError } = await supabase
    .from('acct_journal_entries')
    .insert({
      date: input.date,
      description: input.description,
      reference: input.reference ?? null,
      source: input.source ?? 'manual',
      is_posted: true,
    })
    .select()
    .single()

  if (entryError) throw new Error(entryError.message)

  const { error: linesError } = await supabase.from('acct_journal_lines').insert(
    input.lines.map(l => ({
      entry_id: entry.id,
      account_id: l.account_id,
      debit: l.debit || 0,
      credit: l.credit || 0,
      description: l.description ?? null,
    }))
  )

  if (linesError) throw new Error(linesError.message)

  return entry
}

export function getAccountBalance(
  account: Account,
  totalDebits: number,
  totalCredits: number
): number {
  return account.normal_balance === 'debit'
    ? totalDebits - totalCredits
    : totalCredits - totalDebits
}

export function normalBalance(type: AccountType): 'debit' | 'credit' {
  return type === 'asset' || type === 'expense' ? 'debit' : 'credit'
}
