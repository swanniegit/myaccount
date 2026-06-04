import { describe, it, expect } from 'vitest'
import type { SupabaseClient } from '@supabase/supabase-js'
import { importStatement } from '@/lib/banking/import-statement'
import type { BankTxnInput } from '@/lib/banking/parse-statement-csv'

type PriorRow = { date: string; amount: number; description: string }

/**
 * Minimal Supabase stub matching the exact chains importStatement uses:
 *   accounts: .select().eq().maybeSingle()
 *   txns:     .select().eq().gte().lte().order().range(from, to)  (paginated)
 *             .insert(rows)
 *   accounts: .update({...}).eq()
 * `priorPages` serves one page per .range() call (page N = priorPages[N]).
 */
function makeClient({ account, priorPages = [[]] }: { account?: { id: string; account_number: string | null }; priorPages?: PriorRow[][] }) {
  const inserted: Record<string, unknown>[] = []
  const balanceUpdates: Record<string, unknown>[] = []

  const builder = {
    select: () => builder,
    eq: () => builder,
    gte: () => builder,
    lte: () => builder,
    order: () => builder,
    maybeSingle: () => Promise.resolve({ data: account ?? null, error: null }),
    range: (from: number) => Promise.resolve({ data: priorPages[from / 1000] ?? [], error: null }),
    insert: (rows: Record<string, unknown>[]) => { inserted.push(...rows); return Promise.resolve({ data: rows, error: null }) },
    update: (vals: Record<string, unknown>) => ({ eq: () => { balanceUpdates.push(vals); return Promise.resolve({ data: null, error: null }) } }),
  }

  const client = { from: () => builder } as unknown as SupabaseClient
  return { client, inserted, balanceUpdates }
}

const ACC = { id: 'acc1', account_number: '63044191201' }

describe('importStatement', () => {
  it('inserts all transactions and updates the closing balance when nothing exists yet', async () => {
    const txns: BankTxnInput[] = [
      { date: '2026-06-01', description: 'A', amount: -10 },
      { date: '2026-06-02', description: 'B', amount: 20 },
    ]
    const { client, inserted, balanceUpdates } = makeClient({ account: ACC })
    const res = await importStatement(client, { bankAccountId: 'acc1', statementAccountNumber: '63044191201', closingBalance: 100, transactions: txns })

    expect(res).toEqual({ inserted: 2, skipped: 0 })
    expect(inserted).toHaveLength(2)
    expect(inserted[0]).toMatchObject({ bank_account_id: 'acc1', is_reconciled: false, journal_line_id: null })
    expect(balanceUpdates).toEqual([{ balance: 100 }])
  })

  it('skips rows already present in the date range', async () => {
    const txns: BankTxnInput[] = [
      { date: '2026-06-01', description: 'A', amount: -10 },
      { date: '2026-06-02', description: 'B', amount: 20 },
    ]
    const { client, inserted } = makeClient({ account: ACC, priorPages: [[{ date: '2026-06-01', amount: -10, description: 'A' }]] })
    const res = await importStatement(client, { bankAccountId: 'acc1', transactions: txns })

    expect(res).toEqual({ inserted: 1, skipped: 1 })
    expect(inserted).toHaveLength(1)
    expect(inserted[0]).toMatchObject({ description: 'B' })
  })

  it('preserves a genuine same-day/same-amount duplicate (multiset, not set)', async () => {
    const dup: BankTxnInput = { date: '2026-06-01', description: 'WCA', amount: -278.77 }

    // Both new — both inserted.
    const fresh = makeClient({ account: ACC })
    expect(await importStatement(fresh.client, { bankAccountId: 'acc1', transactions: [dup, { ...dup }] }))
      .toEqual({ inserted: 2, skipped: 0 })

    // One already present — exactly one inserted, the other skipped.
    const partial = makeClient({ account: ACC, priorPages: [[{ date: '2026-06-01', amount: -278.77, description: 'WCA' }]] })
    expect(await importStatement(partial.client, { bankAccountId: 'acc1', transactions: [dup, { ...dup }] }))
      .toEqual({ inserted: 1, skipped: 1 })
  })

  it('paginates the existing-rows query past one page', async () => {
    const page0: PriorRow[] = Array.from({ length: 1000 }, (_, i) => ({ date: '2026-06-01', amount: i, description: `x${i}` }))
    const page1: PriorRow[] = [{ date: '2026-06-02', amount: 20, description: 'B' }]
    const { client } = makeClient({ account: ACC, priorPages: [page0, page1] })

    // 'B' only exists on the second page — it can only be deduped if page 1 was fetched.
    const res = await importStatement(client, { bankAccountId: 'acc1', transactions: [{ date: '2026-06-02', description: 'B', amount: 20 }] })
    expect(res).toEqual({ inserted: 0, skipped: 1 })
  })

  it('rejects when the statement account number does not match the target account', async () => {
    const { client } = makeClient({ account: { id: 'acc1', account_number: '111' } })
    await expect(importStatement(client, { bankAccountId: 'acc1', statementAccountNumber: '999', transactions: [{ date: '2026-06-01', description: 'A', amount: -10 }] }))
      .rejects.toThrow(/Statement is for account 999/)
  })

  it('rejects when the bank account does not exist', async () => {
    const { client } = makeClient({ account: undefined })
    await expect(importStatement(client, { bankAccountId: 'nope', transactions: [{ date: '2026-06-01', description: 'A', amount: -10 }] }))
      .rejects.toThrow(/Bank account not found/)
  })
})
