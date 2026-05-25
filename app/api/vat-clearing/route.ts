import { NextRequest, NextResponse } from 'next/server'
import { createServerClient } from '@/lib/supabase-server'
import { recordJournalEntry } from '@/lib/ledger'

// POST /api/vat-clearing
// Body: { from: string; to: string; clearing_date: string }
// V-06: Dr 2100 VAT Output / Cr 1300 VAT Input / Cr 2110 SARS VAT Payable
// Idempotent: rejects if a clearing entry for this period already exists.

export async function POST(req: NextRequest) {
  let body: { from: string; to: string; clearing_date: string }
  try { body = await req.json() } catch {
    return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 })
  }

  const { from, to, clearing_date } = body
  if (!from || !to || !clearing_date) {
    return NextResponse.json({ error: 'from, to, and clearing_date are required' }, { status: 400 })
  }

  const supabase = createServerClient()

  // Idempotency — one clearing per period
  const ref = `VAT-CLEAR-${from.slice(0, 7)}`
  const { data: existing } = await supabase
    .from('acct_journal_entries')
    .select('id')
    .eq('reference', ref)
    .maybeSingle()

  if (existing) {
    return NextResponse.json({ error: `VAT clearing for ${from.slice(0, 7)} already posted (${ref}). Reverse that entry if you need to re-run.` }, { status: 409 })
  }

  // Fetch period VAT totals from the VAT 201 route logic
  const vatRes = await fetch(
    `${req.nextUrl.origin}/api/vat201?from=${from}&to=${to}`,
    { headers: { cookie: req.headers.get('cookie') ?? '' } }
  )
  const vatData = await vatRes.json()
  if (!vatRes.ok) return NextResponse.json({ error: vatData.error ?? 'Failed to load VAT data' }, { status: 500 })

  const outputVAT  = Number(vatData.outputVAT  ?? 0)
  const inputVAT   = Number(vatData.inputVAT   ?? 0)
  const netPayable = Number(vatData.netPayable  ?? 0)

  if (outputVAT === 0 && inputVAT === 0) {
    return NextResponse.json({ error: 'No VAT postings found for this period — nothing to clear.' }, { status: 422 })
  }

  // Resolve accounts
  const { data: accounts } = await supabase
    .from('acct_accounts')
    .select('id, code')
    .in('code', ['2100', '1300', '2110'])
    .eq('is_active', true)

  const acc2100 = accounts?.find(a => a.code === '2100')
  const acc1300 = accounts?.find(a => a.code === '1300')
  const acc2110 = accounts?.find(a => a.code === '2110')

  if (!acc2100 || !acc1300 || !acc2110) {
    return NextResponse.json({ error: 'Accounts 2100, 1300 or 2110 not found' }, { status: 500 })
  }

  const lines = [
    { account_id: acc2100.id, debit: outputVAT,  credit: 0,          description: 'VAT clearing — output' },
    { account_id: acc1300.id, debit: 0,           credit: inputVAT,   description: 'VAT clearing — input' },
    { account_id: acc2110.id, debit: 0,           credit: netPayable, description: 'SARS VAT payable' },
  ]

  try {
    const { entry } = await recordJournalEntry(supabase, {
      date: clearing_date,
      description: `VAT clearing ${from.slice(0, 7)} to ${to.slice(0, 7)}`,
      reference: ref,
      source: 'manual',
      lines,
    })

    return NextResponse.json({
      success: true,
      entry_id: entry.id,
      reference: ref,
      output_vat: outputVAT,
      input_vat: inputVAT,
      net_payable: netPayable,
    })
  } catch (err) {
    return NextResponse.json({ error: (err as Error).message }, { status: 422 })
  }
}
