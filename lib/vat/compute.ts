import type { SupabaseClient } from '@supabase/supabase-js'

// Shared VAT 201 computation — called by both the GET /api/vat201 route
// and the POST /api/vat-clearing route so they stay consistent.

const PAGE = 1000

function round2(n: number) { return Math.round(n * 100) / 100 }

export interface Vat201Result {
  period: { from: string; to: string }
  // Output boxes
  box1Excl: number
  box2Excl: number
  box3Excl: number
  box4Vat: number
  box11: number
  // Input boxes
  box12Excl: number
  box14: number
  box14A: number
  box14AExcl: number
  box15Excl: number
  box15AExcl: number
  box16: number
  box17: number
  box18: number
  box19: number
  box20: number
  // Summary
  netPayable: number
  entryCount: number
  // Legacy aliases used by the VAT page
  revenueExcl: number
  outputVAT: number
  inputVAT: number
  inputExcl: number
}

export async function computeVat201(
  supabase: SupabaseClient,
  from: string,
  to: string
): Promise<Vat201Result> {
  const { data: accounts, error: accErr } = await supabase
    .from('acct_accounts')
    .select('id, code, type, is_vat_account')
    .eq('is_active', true)

  if (accErr || !accounts) throw new Error(accErr?.message ?? 'accounts error')

  const outputVatId = accounts.find(a => a.code === '2100')?.id
  const inputVatId  = accounts.find(a => a.code === '1300')?.id
  const revenueIds  = accounts.filter(a => a.type === 'revenue').map(a => a.id)
  const relevantIds = Array.from(new Set(
    [outputVatId, inputVatId, ...revenueIds].filter(Boolean)
  )) as string[]

  // V-02: load rates from DB instead of hardcoding 0.15
  const { data: taxTypes } = await supabase
    .from('acct_tax_types')
    .select('code, rate')
    .in('code', ['01', '05'])
  const rate01 = Number(taxTypes?.find(t => t.code === '01')?.rate ?? 0.15)
  const rate05 = Number(taxTypes?.find(t => t.code === '05')?.rate ?? 0.15)

  const { count: entryCount } = await supabase
    .from('acct_journal_entries')
    .select('*', { count: 'exact', head: true })
    .gte('date', from)
    .lte('date', to)
    .eq('is_posted', true)

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

    if (lErr) throw new Error(lErr.message)
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
      return s + (t.credit - t.debit)
    }, 0)
  }

  // --- Output ---
  const box1Excl = sumRevenue('01') + sumRevenue('02')
  const box2Excl = sumRevenue('03')
  const box3Excl = sumRevenue('04')
  const box4Vat  = 0

  const outputVatAll = (() => {
    let tot = 0
    for (const [key, side] of Object.entries(acc)) {
      if (key.startsWith(`${outputVatId}:`)) tot += side.credit - side.debit
    }
    return tot
  })()

  // --- Input ---
  const box14 = (() => {
    const t01   = getAmt(inputVatId, '01')
    const tNull = getAmt(inputVatId, null)
    return (t01.debit - t01.credit) + (tNull.debit - tNull.credit)
  })()
  const box14A     = (() => { const t = getAmt(inputVatId, '05'); return t.debit - t.credit })()
  const box15Excl  = (() => { const t = getAmt(inputVatId, '03'); return t.debit - t.credit })()
  const box15AExcl = (() => { const t = getAmt(inputVatId, '04'); return t.debit - t.credit })()
  const box16 = 0, box17 = 0, box18 = 0, box19 = 0

  const inputVatAll = (() => {
    let tot = 0
    for (const [key, side] of Object.entries(acc)) {
      if (key.startsWith(`${inputVatId}:`)) tot += side.debit - side.credit
    }
    return tot
  })()

  // V-02: excl derived from actual rate, not hardcoded 0.15
  const box12Excl  = rate01 > 0 && box14  > 0 ? box14  / rate01 : 0
  const box14AExcl = rate05 > 0 && box14A > 0 ? box14A / rate05 : 0

  // V-05: full SARS net = (Box4 + Box11) − (Box14 + Box14A + Box15 + Box15A + 16..19)
  const totalOutput = box4Vat + outputVatAll
  const totalInput  = box14 + box14A + box15Excl + box15AExcl + box16 + box17 + box18 + box19
  const netPayable  = totalOutput - totalInput

  return {
    period: { from, to },
    box1Excl:    round2(box1Excl),
    box2Excl:    round2(box2Excl),
    box3Excl:    round2(box3Excl),
    box4Vat:     round2(box4Vat),
    box11:       round2(outputVatAll),
    box12Excl:   round2(box12Excl),
    box14:       round2(box14),
    box14A:      round2(box14A),
    box14AExcl:  round2(box14AExcl),
    box15Excl:   round2(box15Excl),
    box15AExcl:  round2(box15AExcl),
    box16,
    box17,
    box18,
    box19,
    box20:       round2(inputVatAll),
    netPayable:  round2(netPayable),
    entryCount:  entryCount ?? 0,
    // Legacy aliases
    revenueExcl: round2(box1Excl),
    outputVAT:   round2(outputVatAll),
    inputVAT:    round2(inputVatAll),
    inputExcl:   round2(box12Excl),
  }
}
