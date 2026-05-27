import type { SupabaseClient } from '@supabase/supabase-js'
import { recordJournalEntry } from '@/lib/ledger'
import type { JournalLineInput } from '@/lib/ledger'
import { getAccountId } from '@/lib/livehis-push/account-lookup'
import { round2 } from '@/lib/utils'

export interface InterestItem {
  name: string
  overdue: number
  interest: number
}

/** Pure: monthly finance charge per customer = overdue × (annual% / 12). Drops zero-interest rows. */
export function computeInterest(
  rows: { name: string; overdue: number }[],
  annualRatePct: number,
): InterestItem[] {
  const monthly = annualRatePct / 100 / 12
  return rows
    .map(r => ({ name: r.name, overdue: round2(r.overdue), interest: round2(r.overdue * monthly) }))
    .filter(r => r.interest > 0)
    .sort((a, b) => b.interest - a.interest)
}

/** Pure: Dr AR per customer, Cr Interest Income for the total. Balances by construction. */
export function buildInterestLines(
  items: InterestItem[],
  arAccountId: string,
  incomeAccountId: string,
): JournalLineInput[] {
  const total = round2(items.reduce((s, i) => s + i.interest, 0))
  return [
    ...items.map(i => ({ account_id: arAccountId, debit: i.interest, credit: 0, description: `Interest — ${i.name}` })),
    { account_id: incomeAccountId, debit: 0, credit: total, description: 'Interest income — finance charges' },
  ]
}

/** Post an interest run: Dr AR per customer, Cr Interest Income (4300). source 'invoice' clears the control guard. */
export async function postInterestRun(
  supabase: SupabaseClient,
  input: { date: string; items: InterestItem[] },
): Promise<{ entryId: string; journalNumber: number | null; total: number }> {
  const total = round2(input.items.reduce((s, i) => s + i.interest, 0))
  if (total <= 0) throw new Error('No interest to charge')

  const [arId, incomeId] = await Promise.all([
    getAccountId(supabase, '1100'),
    getAccountId(supabase, '4300'),
  ])

  const lines = buildInterestLines(input.items, arId, incomeId)

  const { entry } = await recordJournalEntry(supabase, {
    date: input.date,
    description: 'Interest charged — overdue customer balances',
    source: 'invoice',
    lines,
  })
  return { entryId: entry.id, journalNumber: entry.journal_number, total }
}
