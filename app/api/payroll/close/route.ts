import { NextResponse } from 'next/server'
import { createServerClient } from '@/lib/supabase-server'
import { recordJournalEntry } from '@/lib/ledger'
import { getAccountId } from '@/lib/livehis-push/account-lookup'
import { getDefaultBankAccountId } from '@/lib/banking/get-default-bank'

// POST /api/payroll/close
// Body: { period_id: string }
// Posts the payroll GL entry and marks the period as 'paid'.
// Dr 5100 Salaries (gross + employer UIF + SDL)
// Cr 2200 PAYE Payable
// Cr 2210 UIF Payable (employee + employer)
// Cr 2220 SDL Payable (if > 0)
// Cr Bank (default bank account)
// Idempotent: rejects if period is already paid.

export async function POST(req: Request) {
  let body: { period_id: string }
  try { body = await req.json() } catch {
    return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 })
  }

  const { period_id } = body
  if (!period_id) return NextResponse.json({ error: 'period_id required' }, { status: 400 })

  const supabase = createServerClient()

  const { data: period, error: pErr } = await supabase
    .from('pr_periods')
    .select('*')
    .eq('id', period_id)
    .single()

  if (pErr || !period) return NextResponse.json({ error: 'Period not found' }, { status: 404 })
  if (period.status === 'paid') {
    return NextResponse.json({ error: `Period ${period.year}-${period.month} is already paid and posted to GL.` }, { status: 409 })
  }
  if (period.status !== 'approved') {
    return NextResponse.json({ error: 'Period must be approved before posting to GL.' }, { status: 422 })
  }

  const { data: payslips, error: psErr } = await supabase
    .from('pr_payslips')
    .select('gross, paye, uif_employee, uif_employer, sdl, net')
    .eq('period_id', period_id)
    .eq('status', 'approved')

  if (psErr || !payslips?.length) {
    return NextResponse.json({ error: 'No approved payslips found for this period.' }, { status: 422 })
  }

  const totalGross   = payslips.reduce((s, p) => s + Number(p.gross),        0)
  const totalPaye    = payslips.reduce((s, p) => s + Number(p.paye),         0)
  const totalUifEe   = payslips.reduce((s, p) => s + Number(p.uif_employee), 0)
  const totalUifEr   = payslips.reduce((s, p) => s + Number(p.uif_employer), 0)
  const totalSdl     = payslips.reduce((s, p) => s + Number(p.sdl),          0)
  const totalNet     = payslips.reduce((s, p) => s + Number(p.net),          0)

  const round2 = (n: number) => Math.round(n * 100) / 100
  const drSalaries = round2(totalGross + totalUifEr + totalSdl)
  const crPaye     = round2(totalPaye)
  const crUif      = round2(totalUifEe + totalUifEr)
  const crSdl      = round2(totalSdl)
  const crBank     = round2(totalNet)

  const [sal5100, paye2200, uif2210, sdl2220, bankId] = await Promise.all([
    getAccountId(supabase, '5100'),
    getAccountId(supabase, '2200'),
    getAccountId(supabase, '2210'),
    getAccountId(supabase, '2220'),
    getDefaultBankAccountId(supabase),
  ])

  const monthStr = `${period.year}-${String(period.month).padStart(2, '0')}`
  const description = `Payroll ${monthStr}`
  const reference   = `PR-${monthStr}`

  const lines = [
    { account_id: sal5100,  debit: drSalaries, credit: 0,       description: `Salaries — ${monthStr}` },
    { account_id: paye2200, debit: 0,          credit: crPaye,  description: `PAYE — ${monthStr}` },
    { account_id: uif2210,  debit: 0,          credit: crUif,   description: `UIF — ${monthStr}` },
    ...(crSdl > 0 ? [{ account_id: sdl2220, debit: 0, credit: crSdl, description: `SDL — ${monthStr}` }] : []),
    { account_id: bankId,   debit: 0,          credit: crBank,  description: `Net pay — ${monthStr}` },
  ]

  try {
    const { entry } = await recordJournalEntry(supabase, {
      date: period.pay_date,
      description,
      reference,
      source: 'payroll',
      lines,
    })

    const { error: psUpdateErr } = await supabase
      .from('pr_payslips')
      .update({ status: 'paid' })
      .eq('period_id', period_id)
    if (psUpdateErr) throw new Error(`GL posted but failed to mark payslips paid: ${psUpdateErr.message}`)

    const { error: pUpdateErr } = await supabase
      .from('pr_periods')
      .update({ status: 'paid' })
      .eq('id', period_id)
    if (pUpdateErr) throw new Error(`GL posted but failed to mark period paid: ${pUpdateErr.message}`)

    return NextResponse.json({
      ok: true,
      entry_id: entry.id,
      reference,
      gross: drSalaries,
      net: crBank,
    })
  } catch (err) {
    return NextResponse.json({ error: (err as Error).message }, { status: 422 })
  }
}
