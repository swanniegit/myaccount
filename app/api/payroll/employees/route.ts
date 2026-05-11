import { NextResponse } from 'next/server'
import { createServerClient } from '@/lib/supabase-server'

export async function GET() {
  const supabase = createServerClient()
  const { data, error } = await supabase
    .from('pr_employees')
    .select('*')
    .order('full_name')
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json(data)
}

export async function POST(req: Request) {
  const supabase = createServerClient()
  const body = await req.json()

  const { data, error } = await supabase
    .from('pr_employees')
    .insert({
      code:             body.code,
      full_name:        body.full_name,
      id_number:        body.id_number ?? null,
      date_of_birth:    body.date_of_birth ?? null,
      tax_number:       body.tax_number ?? null,
      tax_status:       body.tax_status ?? 'resident',
      hire_date:        body.hire_date,
      pay_frequency:    body.pay_frequency ?? 'monthly',
      basic_salary:     Number(body.basic_salary ?? 0),
      is_active:        true,
      bank_name:        body.bank_name ?? null,
      bank_branch:      body.bank_branch ?? null,
      bank_account:     body.bank_account ?? null,
      bank_type:        body.bank_type ?? null,
      job_title:        body.job_title ?? null,
      department:       body.department ?? null,
    })
    .select()
    .single()

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json(data)
}
