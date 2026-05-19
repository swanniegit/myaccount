import type { SupabaseClient } from '@supabase/supabase-js'
import { supabase as browserSupabase } from './supabase'
import type { Account, AccountType, EntrySource, JournalEntry } from './types'

export type { EntrySource }

export interface JournalLineInput {
  account_id: string
  debit: number
  credit: number
  description?: string
}

export interface RecordEntryInput {
  date: string
  description: string
  reference?: string
  source?: EntrySource
  lines: JournalLineInput[]
}

export interface PostedJournalLine {
  id: string
  account_id: string
  debit: number
  credit: number
}

export interface RecordEntryResult {
  entry: JournalEntry
  lines: PostedJournalLine[]
}

const BALANCE_TOLERANCE = 0.001

export function assertJournalBalanced(lines: Pick<JournalLineInput, 'debit' | 'credit'>[]): void {
  const totalDebits = lines.reduce((s, l) => s + (l.debit || 0), 0)
  const totalCredits = lines.reduce((s, l) => s + (l.credit || 0), 0)
  if (Math.abs(totalDebits - totalCredits) > BALANCE_TOLERANCE) {
    throw new Error(
      `Debits (R ${totalDebits.toFixed(2)}) must equal Credits (R ${totalCredits.toFixed(2)})`
    )
  }
}

/** Post a balanced journal entry (entry header + lines). Prefer this for all GL writes. */
export async function recordJournalEntry(
  supabase: SupabaseClient,
  input: RecordEntryInput
): Promise<RecordEntryResult> {
  assertJournalBalanced(input.lines)

  const { data, error } = await supabase.rpc('acct_post_journal_entry', {
    p_date: input.date,
    p_description: input.description,
    p_reference: input.reference ?? null,
    p_source: input.source ?? 'manual',
    p_lines: input.lines.map(l => ({
      account_id: l.account_id,
      debit: l.debit || 0,
      credit: l.credit || 0,
      description: l.description ?? null,
    })),
  })

  if (error) throw new Error(error.message)
  if (!data?.entry_id) throw new Error('Failed to post journal entry')

  const entry: JournalEntry = {
    id: data.entry_id,
    date: input.date,
    description: input.description,
    reference: input.reference ?? null,
    source: input.source ?? 'manual',
    is_posted: true,
    created_at: new Date().toISOString(),
  }

  const lines: PostedJournalLine[] = (data.lines ?? []).map(
    (l: { id: string; account_id: string; debit: number; credit: number }) => ({
      id: l.id,
      account_id: l.account_id,
      debit: Number(l.debit),
      credit: Number(l.credit),
    })
  )

  return { entry, lines }
}

/** Client components: posts via browser Supabase client. */
export function recordJournalEntryClient(input: RecordEntryInput) {
  return recordJournalEntry(browserSupabase, input)
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
