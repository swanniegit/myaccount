import { describe, it, expect } from 'vitest'
import { computeInterest, buildInterestLines } from '@/lib/customers/charge-interest'

describe('computeInterest', () => {
  it('charges annual rate / 12 on overdue balance, rounded', () => {
    const items = computeInterest([{ name: 'Acme', overdue: 1000 }], 12) // 1%/month
    expect(items[0].interest).toBe(10)
  })

  it('drops customers with no resulting interest and sorts by interest desc', () => {
    const items = computeInterest(
      [{ name: 'A', overdue: 0 }, { name: 'B', overdue: 5000 }, { name: 'C', overdue: 500 }],
      12,
    )
    expect(items.map(i => i.name)).toEqual(['B', 'C'])
    expect(items[0].interest).toBe(50)
    expect(items[1].interest).toBe(5)
  })

  it('zero rate yields no charges', () => {
    expect(computeInterest([{ name: 'A', overdue: 1000 }], 0)).toEqual([])
  })
})

describe('buildInterestLines', () => {
  it('debits AR per customer and credits Interest Income the total — balanced', () => {
    const items = [
      { name: 'A', overdue: 1000, interest: 10 },
      { name: 'B', overdue: 500, interest: 5 },
    ]
    const lines = buildInterestLines(items, 'ar', 'income')
    const dr = lines.reduce((s, l) => s + l.debit, 0)
    const cr = lines.reduce((s, l) => s + l.credit, 0)
    expect(dr).toBe(15)
    expect(cr).toBe(15)
    expect(lines.filter(l => l.account_id === 'ar')).toHaveLength(2)
    const income = lines.find(l => l.account_id === 'income')!
    expect(income.credit).toBe(15)
  })
})
