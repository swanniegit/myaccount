import { NextResponse } from 'next/server'
import { createServerClient } from '@/lib/supabase-server'

type SB = ReturnType<typeof createServerClient>

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url)
  const employeeId = searchParams.get('employee_id')
  const supabase = createServerClient()

  const balQ = supabase.from('pr_leave_balances').select('*, employee:pr_employees(id, full_name, code)').order('type')
  if (employeeId) balQ.eq('employee_id', employeeId)

  const reqQ = supabase.from('pr_leave_requests').select('*').order('from_date', { ascending: false }).limit(100)
  if (employeeId) reqQ.eq('employee_id', employeeId)

  const [{ data: balances, error }, { data: requests }] = await Promise.all([balQ, reqQ])
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ balances, requests })
}

async function deductLeaveBalance(supabase: SB, requestId: string) {
  const { data: req } = await supabase.from('pr_leave_requests').select('employee_id, type, days').eq('id', requestId).single()
  if (!req) return
  const { data: bal } = await supabase.from('pr_leave_balances').select('id, taken').eq('employee_id', req.employee_id).eq('type', req.type).single()
  if (!bal) return
  await supabase.from('pr_leave_balances').update({ taken: Number(bal.taken) + Number(req.days) }).eq('id', bal.id)
}

export async function POST(req: Request) {
  const supabase = createServerClient()
  const body = await req.json()

  if (body.action === 'seed') {
    // Initialise leave balances for all active employees (no-op if already exist)
    const { data: emps } = await supabase.from('pr_employees').select('id, hire_date').eq('is_active', true)
    if (!emps?.length) return NextResponse.json({ seeded: 0 })
    const cycleStart = body.cycle_start ?? '2026-03-01'
    const rows = emps.flatMap(e => [
      { employee_id: e.id, type: 'annual',  cycle_start: cycleStart, accrued: 15, taken: 0 },
      { employee_id: e.id, type: 'sick',    cycle_start: cycleStart, accrued: 30, taken: 0 },
      { employee_id: e.id, type: 'family',  cycle_start: cycleStart, accrued: 3,  taken: 0 },
    ])
    await supabase.from('pr_leave_balances').upsert(rows, { onConflict: 'employee_id,type,cycle_start', ignoreDuplicates: true })
    return NextResponse.json({ seeded: rows.length })
  }

  if (body.action === 'request') {
    const { data, error } = await supabase
      .from('pr_leave_requests')
      .insert({ employee_id: body.employee_id, type: body.type, from_date: body.from_date, to_date: body.to_date, days: Number(body.days), status: 'pending', notes: body.notes ?? null })
      .select().single()
    if (error) return NextResponse.json({ error: error.message }, { status: 500 })
    return NextResponse.json(data)
  }

  if (body.action === 'approve' || body.action === 'reject') {
    const newStatus = body.action === 'approve' ? 'approved' : 'rejected'
    const { error } = await supabase.from('pr_leave_requests').update({ status: newStatus, approved_by: body.approved_by ?? null }).eq('id', body.request_id)
    if (error) return NextResponse.json({ error: error.message }, { status: 500 })
    if (body.action === 'approve') await deductLeaveBalance(supabase, body.request_id)
    return NextResponse.json({ ok: true })
  }

  return NextResponse.json({ error: 'unknown action' }, { status: 400 })
}
