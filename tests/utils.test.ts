import { describe, it, expect } from 'vitest'
import { formatMoney, calcVAT, round2, cn, VAT_RATE } from '@/lib/utils'

describe('round2', () => {
  it('rounds to two decimals', () => {
    expect(round2(0.1 + 0.2)).toBe(0.3)
    expect(round2(1.234)).toBe(1.23)
    expect(round2(1.236)).toBe(1.24)
    expect(round2(10)).toBe(10)
  })
})

describe('calcVAT', () => {
  it('applies the default 15% rate', () => {
    expect(VAT_RATE).toBe(0.15)
    expect(calcVAT(100)).toBe(15)
    expect(calcVAT(1000)).toBe(150)
  })

  it('accepts a custom rate', () => {
    expect(calcVAT(200, 0.1)).toBe(20)
  })
})

describe('formatMoney', () => {
  it('prefixes positive amounts with "R "', () => {
    expect(formatMoney(100).startsWith('R ')).toBe(true)
  })

  it('prefixes negative amounts with "-R "', () => {
    expect(formatMoney(-100).startsWith('-R ')).toBe(true)
  })

  it('always renders two decimal places', () => {
    expect(formatMoney(5)).toMatch(/5[.,]00$/)
  })
})

describe('cn', () => {
  it('joins truthy class names and drops falsy ones', () => {
    expect(cn('a', false, null, undefined, 'b')).toBe('a b')
    expect(cn()).toBe('')
  })
})
