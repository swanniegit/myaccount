import { NextResponse } from 'next/server'
import { createServerClient } from '@/lib/supabase-server'
import type { NewEmployee } from '@/lib/payroll/employee-import'

export async function POST(req: Request) {
  const supabase = createServerClient()
  const { employees } = await req.json() as { employees?: NewEmployee[] }

  if (!Array.isArray(employees) || employees.length === 0) {
    return NextResponse.json({ error: 'No employees to import' }, { status: 400 })
  }

  const rows = employees.map(e => ({
    code:          e.code,
    full_name:     e.full_name,
    id_number:     e.id_number ?? null,
    date_of_birth: e.date_of_birth ?? null,
    tax_number:    e.tax_number ?? null,
    tax_status:    e.tax_status ?? 'resident',
    hire_date:     e.hire_date,
    pay_frequency: e.pay_frequency ?? 'monthly',
    basic_salary:  Number(e.basic_salary ?? 0),
    is_active:     true,
    bank_name:     e.bank_name ?? null,
    bank_branch:   e.bank_branch ?? null,
    bank_account:  e.bank_account ?? null,
    bank_type:     e.bank_type ?? null,
    job_title:     e.job_title ?? null,
    department:    e.department ?? null,
  }))

  const { data, error } = await supabase.from('pr_employees').insert(rows).select('id')
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ inserted: data?.length ?? 0 })
}
