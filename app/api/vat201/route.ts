import { NextRequest, NextResponse } from 'next/server'
import { createServerClient } from '@/lib/supabase-server'

export async function GET(req: NextRequest) {
  const { searchParams } = req.nextUrl
  const from = searchParams.get('from')
  const to   = searchParams.get('to')

  if (!from || !to) {
    return NextResponse.json({ error: 'from and to query params required (YYYY-MM-DD)' }, { status: 400 })
  }

  const supabase = createServerClient()

  // 1. Resolve relevant account IDs
  const { data: accounts, error: accErr } = await supabase
    .from('acct_accounts')
    .select('id, code, type, is_vat_account')
    .or('type.eq.revenue,is_vat_account.eq.true')
    .eq('is_active', true)

  if (accErr || !accounts) {
    return NextResponse.json({ error: accErr?.message ?? 'accounts error' }, { status: 500 })
  }

  const outputVatId = accounts.find(a => a.code === '2100')?.id
  const inputVatId  = accounts.find(a => a.code === '1300')?.id
  const revenueIds  = accounts.filter(a => a.type === 'revenue').map(a => a.id)
  const relevantIds = [outputVatId, inputVatId, ...revenueIds].filter(Boolean) as string[]

  // 2. Count entries in range (for the UI display)
  const { count: entryCount } = await supabase
    .from('acct_journal_entries')
    .select('*', { count: 'exact', head: true })
    .gte('date', from)
    .lte('date', to)
    .eq('is_posted', true)

  // 3. Fetch journal lines joined to entries — paginate until exhausted
  //    Uses embedded resource + inner join so Supabase filters by entry.date server-side
  const PAGE = 1000
  let offset = 0
  let revenueExcl = 0
  let outputVAT   = 0
  let inputVAT    = 0

  while (true) {
    const { data: lines, error: lErr } = await supabase
      .from('acct_journal_lines')
      .select('account_id, debit, credit, acct_journal_entries!inner(date, is_posted)')
      .in('account_id', relevantIds)
      .gte('acct_journal_entries.date', from)
      .lte('acct_journal_entries.date', to)
      .eq('acct_journal_entries.is_posted', true)
      .range(offset, offset + PAGE - 1)

    if (lErr) return NextResponse.json({ error: lErr.message }, { status: 500 })
    if (!lines?.length) break

    for (const l of lines) {
      const dr = Number(l.debit)
      const cr = Number(l.credit)
      if (l.account_id === outputVatId) {
        outputVAT   += cr - dr
      } else if (l.account_id === inputVatId) {
        inputVAT    += dr - cr
      } else {
        revenueExcl += cr - dr
      }
    }

    if (lines.length < PAGE) break
    offset += PAGE
  }

  const round2 = (n: number) => Math.round(n * 100) / 100

  return NextResponse.json({
    period:      { from, to },
    revenueExcl: round2(revenueExcl),
    outputVAT:   round2(outputVAT),
    inputVAT:    round2(inputVAT),
    inputExcl:   round2(inputVAT > 0 ? inputVAT / 0.15 : 0),
    netPayable:  round2(outputVAT - inputVAT),
    entryCount:  entryCount ?? 0,
  })
}
