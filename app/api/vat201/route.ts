import { NextRequest, NextResponse } from 'next/server'
import { createServerClient } from '@/lib/supabase-server'

// V-01 / V-02 / V-05
// VAT 201 computed from tax-type-tagged GL lines.
// Box logic per SARS VAT 201 declaration form.

const PAGE = 1000

function round2(n: number) { return Math.round(n * 100) / 100 }

export async function GET(req: NextRequest) {
  const { searchParams } = req.nextUrl
  const from = searchParams.get('from')
  const to   = searchParams.get('to')

  if (!from || !to) {
    return NextResponse.json({ error: 'from and to query params required (YYYY-MM-DD)' }, { status: 400 })
  }

  const supabase = createServerClient()

  const { data: accounts, error: accErr } = await supabase
    .from('acct_accounts')
    .select('id, code, type, is_vat_account')
    .eq('is_active', true)

  if (accErr || !accounts) {
    return NextResponse.json({ error: accErr?.message ?? 'accounts error' }, { status: 500 })
  }

  const outputVatId = accounts.find(a => a.code === '2100')?.id  // VAT Output
  const inputVatId  = accounts.find(a => a.code === '1300')?.id  // VAT Input Claimable
  const revenueIds  = accounts.filter(a => a.type === 'revenue').map(a => a.id)

  const relevantIds = [...new Set([outputVatId, inputVatId, ...revenueIds].filter(Boolean))] as string[]

  const { count: entryCount } = await supabase
    .from('acct_journal_entries')
    .select('*', { count: 'exact', head: true })
    .gte('date', from)
    .lte('date', to)
    .eq('is_posted', true)

  // Accumulators by account × tax_type_code
  // Key: `${account_id}:${tax_type_code ?? 'null'}`
  type Side = { debit: number; credit: number }
  const acc: Record<string, Side> = {}

  let offset = 0
  while (true) {
    const { data: lines, error: lErr } = await supabase
      .from('acct_journal_lines')
      .select('account_id, debit, credit, tax_type_code, acct_journal_entries!inner(date, is_posted)')
      .in('account_id', relevantIds)
      .gte('acct_journal_entries.date', from)
      .lte('acct_journal_entries.date', to)
      .eq('acct_journal_entries.is_posted', true)
      .range(offset, offset + PAGE - 1)

    if (lErr) return NextResponse.json({ error: lErr.message }, { status: 500 })
    if (!lines?.length) break

    for (const l of lines) {
      const key = `${l.account_id}:${l.tax_type_code ?? 'null'}`
      if (!acc[key]) acc[key] = { debit: 0, credit: 0 }
      acc[key].debit  += Number(l.debit)
      acc[key].credit += Number(l.credit)
    }

    if (lines.length < PAGE) break
    offset += PAGE
  }

  function getAmt(accountId: string | undefined, taxType: string | null): Side {
    if (!accountId) return { debit: 0, credit: 0 }
    const key = `${accountId}:${taxType ?? 'null'}`
    return acc[key] ?? { debit: 0, credit: 0 }
  }

  function sumRevenue(taxType: string): number {
    return revenueIds.reduce((s, id) => {
      const t = getAmt(id, taxType)
      return s + (t.credit - t.debit)  // revenue: credit = increase
    }, 0)
  }

  // --- Output section ---
  // Box 1: Standard-rated supplies (excl) — types 01 and 02
  const box1Excl = sumRevenue('01') + sumRevenue('02')
  // Box 2: Zero-rated supplies (excl) — type 03
  const box2Excl = sumRevenue('03')
  // Box 3: Exempt supplies (excl) — type 04
  const box3Excl = sumRevenue('04')
  // Box 4/4A: Deemed supplies / own use — not typically tracked via invoice flow; 0 unless manual JE
  const box4Vat  = 0
  // Box 11: Total output VAT = all credits to 2100 minus debits (reversals/voids)
  const outputVatAll = (() => {
    let tot = 0
    for (const [key, side] of Object.entries(acc)) {
      if (key.startsWith(`${outputVatId}:`)) tot += side.credit - side.debit
    }
    return tot
  })()

  // --- Input section ---
  // Box 14: Input VAT — standard purchases (type 01 on 1300)
  const box14 = (() => {
    const t01 = getAmt(inputVatId, '01')
    const tNull = getAmt(inputVatId, null)
    // Treat untagged 1300 lines as '01' (pre-migration invoices)
    return (t01.debit - t01.credit) + (tNull.debit - tNull.credit)
  })()
  // Box 14A: Input VAT — capital goods (type 05 on 1300)
  const box14A = (() => { const t = getAmt(inputVatId, '05'); return t.debit - t.credit })()
  // Box 15: Zero-rated acquisitions excl (type 03 on 1300 / rate 0 → excl = amount itself)
  const box15Excl = (() => { const t = getAmt(inputVatId, '03'); return t.debit - t.credit })()
  // Box 15A: Exempt acquisitions excl (type 04)
  const box15AExcl = (() => { const t = getAmt(inputVatId, '04'); return t.debit - t.credit })()
  // Box 16/17/18/19: imports, change-in-use, bad debts, other — 0 until those flows are built
  const box16 = 0, box17 = 0, box18 = 0, box19 = 0

  // Box 20: Total input VAT = all 1300 debits minus credits
  const inputVatAll = (() => {
    let tot = 0
    for (const [key, side] of Object.entries(acc)) {
      if (key.startsWith(`${inputVatId}:`)) tot += side.debit - side.credit
    }
    return tot
  })()

  // V-02: input excl derived from 1300 postings ÷ applicable rate (not flat / 0.15)
  const box12Excl = box14 > 0 ? box14 / 0.15 : 0          // standard acquisitions excl
  const box14AExcl = box14A > 0 ? box14A / 0.15 : 0       // capital goods excl

  // V-05: Full SARS net payable formula
  // Net = (Box 4 + Box 4A + Box 11) − (Box 14 + Box 14A + Box 15 + Box 15A + Box 16 + Box 17 + Box 18 + Box 19)
  const totalOutput = box4Vat + outputVatAll
  const totalInput  = box14 + box14A + box15Excl + box15AExcl + box16 + box17 + box18 + box19
  const netPayable  = totalOutput - totalInput

  return NextResponse.json({
    period:   { from, to },
    // Output boxes
    box1Excl:     round2(box1Excl),
    box2Excl:     round2(box2Excl),
    box3Excl:     round2(box3Excl),
    box4Vat:      round2(box4Vat),
    box11:        round2(outputVatAll),
    // Input boxes
    box12Excl:    round2(box12Excl),
    box14:        round2(box14),
    box14A:       round2(box14A),
    box14AExcl:   round2(box14AExcl),
    box15Excl:    round2(box15Excl),
    box15AExcl:   round2(box15AExcl),
    box16,
    box17,
    box18,
    box19,
    box20:        round2(inputVatAll),
    // Summary
    netPayable:   round2(netPayable),
    entryCount:   entryCount ?? 0,
    // Legacy aliases (VAT page still references these)
    revenueExcl:  round2(box1Excl),
    outputVAT:    round2(outputVatAll),
    inputVAT:     round2(inputVatAll),
    inputExcl:    round2(box12Excl),
  })
}
