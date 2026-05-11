import { NextResponse } from 'next/server'
import { createServerClient } from '@/lib/supabase-server'
import { sumPayslipTotals } from '@/lib/payroll/payslip-aggregates'

async function fetchPayslipTotals(supabase: ReturnType<typeof createServerClient>, periodId: string) {
  const { data } = await supabase
    .from('pr_payslips')
    .select('paye, uif_employee, uif_employer, sdl, eti_claimed')
    .eq('period_id', periodId)
  return sumPayslipTotals(data ?? [])
}

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url)
  const periodId = searchParams.get('period_id')
  const supabase = createServerClient()

  if (periodId) {
    const { data: existing } = await supabase
      .from('pr_emp201')
      .select('*')
      .eq('period_id', periodId)
      .maybeSingle()

    if (existing) return NextResponse.json(existing)

    const t = await fetchPayslipTotals(supabase, periodId)
    return NextResponse.json({
      period_id: periodId,
      paye_liability: t.paye,
      uif_liability:  t.uif,
      sdl_liability:  t.sdl,
      eti_claimed:    t.eti,
      total_payable:  t.total,
      status: 'pending',
      submitted_at: null,
      payment_ref: null,
    })
  }

  const { data, error } = await supabase
    .from('pr_emp201')
    .select('*, period:pr_periods(*)')
    .order('created_at', { ascending: false })

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json(data)
}

export async function POST(req: Request) {
  const supabase = createServerClient()
  const body = await req.json()
  const { period_id, payment_ref } = body

  if (body.action !== 'submit') {
    return NextResponse.json({ error: 'unknown action' }, { status: 400 })
  }

  const { data: existing } = await supabase
    .from('pr_emp201')
    .select('id')
    .eq('period_id', period_id)
    .maybeSingle()

  const common = { status: 'submitted', submitted_at: new Date().toISOString(), payment_ref: payment_ref ?? null }

  if (existing) {
    await supabase.from('pr_emp201').update(common).eq('id', existing.id)
  } else {
    const t = await fetchPayslipTotals(supabase, period_id)
    await supabase.from('pr_emp201').insert({
      period_id,
      paye_liability: t.paye,
      uif_liability:  t.uif,
      sdl_liability:  t.sdl,
      eti_claimed:    t.eti,
      total_payable:  t.total,
      ...common,
    })
  }

  return NextResponse.json({ ok: true })
}
