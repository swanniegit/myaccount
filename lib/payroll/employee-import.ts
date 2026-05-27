export interface NewEmployee {
  code: string
  full_name: string
  id_number: string | null
  date_of_birth: string | null
  tax_number: string | null
  tax_status: string
  hire_date: string
  pay_frequency: string
  basic_salary: number
  bank_name: string | null
  bank_branch: string | null
  bank_account: string | null
  bank_type: string | null
  job_title: string | null
  department: string | null
}

// Column order used for the downloadable template.
export const EMPLOYEE_TEMPLATE_HEADER = [
  'code', 'full_name', 'job_title', 'department', 'hire_date', 'basic_salary', 'pay_frequency',
  'id_number', 'date_of_birth', 'tax_number', 'tax_status', 'bank_name', 'bank_branch', 'bank_account', 'bank_type',
]

export const EMPLOYEE_TEMPLATE_EXAMPLE = [
  'EMP001', 'Jane Doe', 'Bookkeeper', 'Finance', '2026-01-01', '25000', 'monthly',
  '9001015800087', '1990-01-01', '1234567890', 'resident', 'FNB', '250655', '62000000000', 'cheque',
]

const REQUIRED = ['code', 'full_name', 'hire_date']

/** Map parsed CSV rows (header + data) to employee records. Header names are matched case-insensitively. */
export function parseEmployeeCsv(rows: string[][]): { employees: NewEmployee[]; errors: string[] } {
  if (rows.length === 0) return { employees: [], errors: ['File is empty.'] }

  const header = rows[0].map(h => h.trim().toLowerCase())
  const idx = (name: string) => header.indexOf(name)
  const missingCols = REQUIRED.filter(c => idx(c) === -1)
  if (missingCols.length) return { employees: [], errors: [`Missing required column(s): ${missingCols.join(', ')}`] }

  const get = (row: string[], name: string) => { const i = idx(name); return i >= 0 ? (row[i] ?? '').trim() : '' }

  const employees: NewEmployee[] = []
  const errors: string[] = []
  for (let r = 1; r < rows.length; r++) {
    const row = rows[r]
    const code = get(row, 'code')
    const full_name = get(row, 'full_name')
    const hire_date = get(row, 'hire_date')

    const missing = REQUIRED.filter(c => !get(row, c))
    if (missing.length === REQUIRED.length) continue // entirely blank row — skip silently
    if (missing.length) { errors.push(`Row ${r + 1}: missing ${missing.join(', ')}`); continue }

    employees.push({
      code,
      full_name,
      hire_date,
      id_number:     get(row, 'id_number') || null,
      date_of_birth: get(row, 'date_of_birth') || null,
      tax_number:    get(row, 'tax_number') || null,
      tax_status:    get(row, 'tax_status') || 'resident',
      pay_frequency: get(row, 'pay_frequency') || 'monthly',
      basic_salary:  Number(get(row, 'basic_salary').replace(/[^0-9.\-]/g, '')) || 0,
      bank_name:     get(row, 'bank_name') || null,
      bank_branch:   get(row, 'bank_branch') || null,
      bank_account:  get(row, 'bank_account') || null,
      bank_type:     get(row, 'bank_type') || null,
      job_title:     get(row, 'job_title') || null,
      department:    get(row, 'department') || null,
    })
  }

  return { employees, errors }
}
