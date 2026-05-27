import { describe, it, expect } from 'vitest'
import { parseEmployeeCsv } from '@/lib/payroll/employee-import'

describe('parseEmployeeCsv', () => {
  it('maps columns by header name (order-independent) and applies defaults', () => {
    const rows = [
      ['full_name', 'code', 'hire_date', 'basic_salary'],
      ['Jane Doe', 'EMP001', '2026-01-01', 'R 25,000'],
    ]
    const { employees, errors } = parseEmployeeCsv(rows)
    expect(errors).toEqual([])
    expect(employees).toHaveLength(1)
    expect(employees[0].code).toBe('EMP001')
    expect(employees[0].full_name).toBe('Jane Doe')
    expect(employees[0].basic_salary).toBe(25000)        // currency chars stripped
    expect(employees[0].tax_status).toBe('resident')     // default
    expect(employees[0].pay_frequency).toBe('monthly')   // default
  })

  it('errors when a required column is absent', () => {
    const { employees, errors } = parseEmployeeCsv([['code', 'full_name'], ['E1', 'A']])
    expect(employees).toHaveLength(0)
    expect(errors[0]).toMatch(/hire_date/)
  })

  it('reports per-row missing required fields and skips fully-blank rows', () => {
    const rows = [
      ['code', 'full_name', 'hire_date'],
      ['E1', '', '2026-01-01'],   // missing full_name
      ['', '', ''],               // blank — skipped
      ['E2', 'Bob', '2026-02-01'],
    ]
    const { employees, errors } = parseEmployeeCsv(rows)
    expect(employees.map(e => e.code)).toEqual(['E2'])
    expect(errors).toEqual(['Row 2: missing full_name'])
  })
})
