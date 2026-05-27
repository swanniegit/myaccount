import { describe, it, expect } from 'vitest'
import { ageInvoices } from '@/lib/ar/aging'

const asOf = new Date('2026-05-27')

describe('ageInvoices', () => {
  it('puts not-yet-due invoices in current', () => {
    const b = ageInvoices([{ total: 100, due_date: '2026-06-10', date: '2026-05-20' }], asOf)
    expect(b.current).toBe(100)
    expect(b.total).toBe(100)
  })

  it('buckets by how overdue the effective due date is', () => {
    const b = ageInvoices([
      { total: 10, due_date: '2026-05-27', date: '2026-05-01' }, // due today -> current
      { total: 20, due_date: '2026-05-10', date: '2026-04-01' }, // 17 days over -> 30
      { total: 40, due_date: '2026-04-20', date: '2026-03-01' }, // ~37 days over -> 60
      { total: 80, due_date: '2026-01-01', date: '2026-01-01' }, // >60 days -> 90+
    ], asOf)
    expect(b.current).toBe(10)
    expect(b.d30).toBe(20)
    expect(b.d60).toBe(40)
    expect(b.d90).toBe(80)
    expect(b.total).toBe(150)
  })

  it('falls back to invoice date when due_date is null', () => {
    const b = ageInvoices([{ total: 50, due_date: null, date: '2026-01-01' }], asOf)
    expect(b.d90).toBe(50)
  })

  it('coerces string totals to numbers', () => {
    const b = ageInvoices([{ total: '100.50', due_date: '2026-06-10', date: '2026-05-20' }], asOf)
    expect(b.current).toBe(100.5)
  })
})
