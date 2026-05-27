import { describe, it, expect } from 'vitest'
import { buildCreditNoteLines } from '@/lib/sales/create-credit-note'

const ids = { revenueAccountId: 'rev', arAccountId: 'ar', vatAccountId: 'vat' }

describe('buildCreditNoteLines', () => {
  it('reverses a sale: Dr revenue + Dr VAT, Cr AR — and balances', () => {
    const lines = buildCreditNoteLines({ ...ids, subtotal: 100, vat: 15 })
    const dr = lines.reduce((s, l) => s + l.debit, 0)
    const cr = lines.reduce((s, l) => s + l.credit, 0)
    expect(dr).toBe(115)
    expect(cr).toBe(115)
    const ar = lines.find(l => l.account_id === 'ar')!
    expect(ar.credit).toBe(115)
    expect(lines.find(l => l.account_id === 'rev')!.debit).toBe(100)
    expect(lines.find(l => l.account_id === 'vat')!.debit).toBe(15)
  })

  it('omits the VAT line when vat is zero', () => {
    const lines = buildCreditNoteLines({ ...ids, subtotal: 100, vat: 0 })
    expect(lines).toHaveLength(2)
    expect(lines.some(l => l.account_id === 'vat')).toBe(false)
    expect(lines.find(l => l.account_id === 'ar')!.credit).toBe(100)
  })
})
