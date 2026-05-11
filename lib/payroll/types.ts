export interface PrEmployee {
  id: string
  code: string
  full_name: string
  id_number: string | null
  date_of_birth: string | null
  tax_number: string | null
  tax_status: 'resident' | 'nonresident'
  hire_date: string
  termination_date: string | null
  pay_frequency: 'monthly' | 'weekly' | 'biweekly'
  basic_salary: number
  is_active: boolean
  bank_name: string | null
  bank_branch: string | null
  bank_account: string | null
  bank_type: string | null
  job_title: string | null
  department: string | null
  created_at: string
  // calculated at runtime
  medical_dependants?: number
}

export interface PrPeriod {
  id: string
  year: number
  month: number
  start_date: string
  end_date: string
  pay_date: string
  status: 'open' | 'calculated' | 'approved' | 'paid'
}

export interface PrPayslip {
  id: string
  period_id: string
  employee_id: string
  gross: number
  total_deductions: number
  net: number
  paye: number
  uif_employee: number
  uif_employer: number
  sdl: number
  eti_claimed: number
  ytd_gross: number
  ytd_paye: number
  ytd_uif: number
  status: 'draft' | 'approved' | 'paid'
  employee?: PrEmployee
  lines?: PrPayslipLine[]
}

export interface PrPayslipLine {
  id: string
  payslip_id: string
  type: 'earning' | 'deduction' | 'employer_contribution'
  sars_code: string | null
  description: string
  amount: number
  sort_order: number
}

export interface PrEMP201 {
  id: string
  period_id: string
  paye_liability: number
  uif_liability: number
  sdl_liability: number
  eti_claimed: number
  total_payable: number
  status: 'pending' | 'submitted' | 'paid'
  submitted_at: string | null
  payment_ref: string | null
}

export interface PrLeaveBalance {
  id: string
  employee_id: string
  type: string
  cycle_start: string
  accrued: number
  taken: number
  employee?: PrEmployee
}

export interface PrLeaveRequest {
  id: string
  employee_id: string
  type: string
  from_date: string
  to_date: string
  days: number
  status: 'pending' | 'approved' | 'rejected'
  notes: string | null
  approved_by: string | null
}

export interface CalcResult {
  gross: number
  paye: number
  uif_employee: number
  uif_employer: number
  sdl: number
  eti: number
  net: number
  workings: string[]
}
