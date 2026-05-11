import { NextResponse } from 'next/server'
import { createServerClient } from '@/lib/supabase-server'
import { calcPayslip } from '@/lib/payroll/paye'
import type { PrEmployee } from '@/lib/payroll/types'

type SB = ReturnType<typeof createServerClient>

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url)
  const periodId = searchParams.get('period_id')
  if (!periodId) return NextResponse.json({ error: 'period_id required' }, { status: 400 })

  const supabase = createServerClient()
  const { data, error } = await supabase
    .from('pr_payslips')
    .select('*, employee:pr_employees(*), lines:pr_payslip_lines(*)')
    .eq('period_id', periodId)
    .order('created_at')

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json(data)
}

async function handleApprove(supabase: SB, periodId: string) {
  const { error } = await supabase
    .from('pr_payslips')
    .update({ status: 'approved' })
    .eq('period_id', periodId)
    .eq('status', 'draft')
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  await supabase.from('pr_periods').update({ status: 'approved' }).eq('id', periodId)
  return NextResponse.json({ ok: true })
}

async function buildPayslipLines(payslipId: string, emp: PrEmployee, gross: number, sdl: number, result: ReturnType<typeof calcPayslip>) {
  return [
    { payslip_id: payslipId, type: 'earning',               sars_code: '3601', description: 'Basic salary',     amount: gross,               sort_order: 1 },
    { payslip_id: payslipId, type: 'deduction',             sars_code: '4102', description: 'PAYE',             amount: result.paye,         sort_order: 10 },
    { payslip_id: payslipId, type: 'deduction',             sars_code: '4141', description: 'UIF (employee)',   amount: result.uif_employee, sort_order: 11 },
    { payslip_id: payslipId, type: 'employer_contribution', sars_code: '4142', description: 'UIF (employer)',   amount: result.uif_employer, sort_order: 20 },
    { payslip_id: payslipId, type: 'employer_contribution', sars_code: '4150', description: 'SDL (employer 1%)', amount: sdl,                sort_order: 21 },
  ]
}

async function handleCalculate(supabase: SB, periodId: string) {
  const { data: period, error: pErr } = await supabase.from('pr_periods').select('*').eq('id', periodId).single()
  if (pErr || !period) return NextResponse.json({ error: 'period not found' }, { status: 404 })

  const { data: employees, error: eErr } = await supabase
    .from('pr_employees').select('*').eq('is_active', true).eq('pay_frequency', 'monthly')
  if (eErr || !employees) return NextResponse.json({ error: 'no employees' }, { status: 500 })

  await supabase.from('pr_payslips').delete().eq('period_id', periodId).eq('status', 'draft')

  const totalMonthly = employees.reduce((s, e) => s + Number(e.basic_salary), 0)
  const sdlExempt = totalMonthly * 12 < 500_000
  const created = []

  for (const emp of employees as PrEmployee[]) {
    const gross  = Number(emp.basic_salary)
    const result = calcPayslip(emp, gross, period.year, period.month, emp.medical_dependants ?? 0)
    const sdl    = sdlExempt ? 0 : result.sdl

    const { data: payslip, error: psErr } = await supabase
      .from('pr_payslips')
      .insert({
        period_id: periodId, employee_id: emp.id,
        gross, total_deductions: result.paye + result.uif_employee, net: result.net,
        paye: result.paye, uif_employee: result.uif_employee, uif_employer: result.uif_employer,
        sdl, eti_claimed: result.eti, ytd_gross: 0, ytd_paye: 0, ytd_uif: 0, status: 'draft',
      })
      .select().single()

    if (psErr || !payslip) continue
    const lines = await buildPayslipLines(payslip.id, emp, gross, sdl, result)
    await supabase.from('pr_payslip_lines').insert(lines)
    created.push({ ...payslip, workings: result.workings })

    // Seed leave balances for new employees (upsert = no-op if already exist)
    const cycleStart = `${period.year}-03-01` // BCEA cycle starts March (SA tax year)
    const leaveSeeds = ['annual', 'sick', 'family'].map(type => ({
      employee_id: emp.id, type,
      cycle_start: cycleStart,
      accrued: type === 'annual' ? 15 : type === 'sick' ? 30 : 3,
      taken: 0,
    }))
    await supabase.from('pr_leave_balances').upsert(leaveSeeds, { onConflict: 'employee_id,type,cycle_start', ignoreDuplicates: true })
  }

  await supabase.from('pr_periods').update({ status: 'calculated' }).eq('id', periodId)
  return NextResponse.json({ ok: true, count: created.length, payslips: created })
}

export async function POST(req: Request) {
  const body = await req.json()
  const supabase = createServerClient()
  if (body.action === 'approve') return handleApprove(supabase, body.period_id)
  return handleCalculate(supabase, body.period_id)
}
