import type { SupabaseClient } from '@supabase/supabase-js'
import { supabase as browserSupabase } from './supabase'
import type { Account, AccountType, EntrySource, JournalEntry } from './types'

export type { EntrySource }

export interface JournalLineInput {
  account_id: string
  debit: number
  credit: number
  description?: string
  tax_type_code?: string | null
}

export interface RecordEntryInput {
  date: string
  description: string
  reference?: string
  source?: EntrySource
  lines: JournalLineInput[]
  created_by?: string
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
const MONTH_NAMES = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec']

async function assertPeriodOpen(supabase: SupabaseClient, date: string): Promise<void> {
  const d = new Date(date)
  const year = d.getFullYear()
  const month = d.getMonth() + 1
  const { data } = await supabase
    .from('acct_periods')
    .select('status')
    .eq('year', year)
    .eq('month', month)
    .maybeSingle()
  if (data?.status === 'closed') {
    throw new Error(
      `Period ${MONTH_NAMES[month - 1]} ${year} is closed — open it in Settings → Periods before posting.`
    )
  }
}

export function assertJournalBalanced(lines: Pick<JournalLineInput, 'debit' | 'credit'>[]): void {
  const totalDebits = lines.reduce((s, l) => s + (l.debit || 0), 0)
  const totalCredits = lines.reduce((s, l) => s + (l.credit || 0), 0)
  if (Math.abs(totalDebits - totalCredits) > BALANCE_TOLERANCE) {
    throw new Error(
      `Debits (R ${totalDebits.toFixed(2)}) must equal Credits (R ${totalCredits.toFixed(2)})`
    )
  }
}

async function postJournalEntryInline(
  supabase: SupabaseClient,
  input: RecordEntryInput
): Promise<RecordEntryResult> {
  const { data: entry, error: entryError } = await supabase
    .from('acct_journal_entries')
    .insert({
      date: input.date,
      description: input.description,
      reference: input.reference ?? null,
      source: input.source ?? 'manual',
      is_posted: true,
      created_by: input.created_by ?? 'system',
    })
    .select()
    .single()

  if (entryError || !entry) throw new Error(entryError?.message ?? 'Failed to create journal entry')

  const { data: insertedLines, error: linesError } = await supabase
    .from('acct_journal_lines')
    .insert(
      input.lines.map(l => ({
        entry_id: entry.id,
        account_id: l.account_id,
        debit: l.debit || 0,
        credit: l.credit || 0,
        description: l.description ?? null,
        tax_type_code: l.tax_type_code ?? null,
      }))
    )
    .select('id, account_id, debit, credit')

  if (linesError || !insertedLines) {
    await supabase.from('acct_journal_entries').delete().eq('id', entry.id)
    throw new Error(linesError?.message ?? 'Failed to create journal lines')
  }

  return {
    entry: entry as JournalEntry,
    lines: insertedLines.map(l => ({
      id: l.id,
      account_id: l.account_id,
      debit: Number(l.debit),
      credit: Number(l.credit),
    })),
  }
}

function rpcUnavailable(error: { code?: string; message?: string }): boolean {
  return (
    error.code === 'PGRST202' ||
    error.message?.includes('acct_post_journal_entry') === true ||
    error.message?.includes('Could not find the function') === true
  )
}

/** Post a balanced journal entry (entry header + lines). Prefer this for all GL writes. */
export async function recordJournalEntry(
  supabase: SupabaseClient,
  input: RecordEntryInput
): Promise<RecordEntryResult> {
  await assertPeriodOpen(supabase, input.date)
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
      tax_type_code: l.tax_type_code ?? null,
    })),
    p_created_by: input.created_by ?? 'system',
  })

  if (error) {
    if (rpcUnavailable(error)) return postJournalEntryInline(supabase, input)
    throw new Error(error.message)
  }
  if (!data?.entry_id) throw new Error('Failed to post journal entry')

  const entry: JournalEntry = {
    id: data.entry_id,
    date: input.date,
    description: input.description,
    reference: input.reference ?? null,
    source: input.source ?? 'manual',
    is_posted: true,
    journal_number: null,
    created_by: input.created_by ?? 'system',
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
