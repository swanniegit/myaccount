import { NextResponse } from 'next/server'
import { createServerClient } from '@/lib/supabase-server'

export async function GET() {
  const supabase = createServerClient()

  // Accounts table is small — fetch in one shot
  const { data: accounts, error: acctErr } = await supabase
    .from('acct_accounts')
    .select('id, code, normal_balance')

  if (acctErr || !accounts) {
    return NextResponse.json({ error: acctErr?.message ?? 'no accounts' }, { status: 500 })
  }

  // Journal lines can exceed PostgREST's default 1000-row page limit.
  // Fetch in 1000-row batches until exhausted.
  const allLines: { account_id: string; debit: number; credit: number }[] = []
  const BATCH = 1000
  let offset = 0

  while (true) {
    const { data: batch, error: batchErr } = await supabase
      .from('acct_journal_lines')
      .select('account_id, debit, credit')
      .range(offset, offset + BATCH - 1)

    if (batchErr) {
      return NextResponse.json({ error: batchErr.message }, { status: 500 })
    }
    if (!batch || batch.length === 0) break
    allLines.push(...batch)
    if (batch.length < BATCH) break
    offset += BATCH
  }

  // Aggregate debit/credit sums per account
  const dr: Record<string, number> = {}
  const cr: Record<string, number> = {}
  for (const line of allLines) {
    dr[line.account_id] = (dr[line.account_id] ?? 0) + Number(line.debit)
    cr[line.account_id] = (cr[line.account_id] ?? 0) + Number(line.credit)
  }

  // Compute signed balance (positive = healthy)
  const bal: Record<string, number> = {}
  for (const acc of accounts) {
    const d = dr[acc.id] ?? 0
    const c = cr[acc.id] ?? 0
    bal[acc.code] = acc.normal_balance === 'debit' ? d - c : c - d
  }

  return NextResponse.json({
    cash: ['1000', '1010', '1020'].reduce((s, c) => s + (bal[c] ?? 0), 0),
    ar:  bal['1100'] ?? 0,
    ap:  bal['2000'] ?? 0,
    vat: bal['2100'] ?? 0,
  })
}
