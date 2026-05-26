import { describe, it, expect } from 'vitest'
import { assertJournalBalanced, normalBalance, getAccountBalance } from '@/lib/ledger'
import type { Account, AccountType } from '@/lib/types'

describe('assertJournalBalanced', () => {
  it('passes when debits equal credits', () => {
    expect(() => assertJournalBalanced([
      { debit: 100, credit: 0 },
      { debit: 0, credit: 100 },
    ])).not.toThrow()
  })

  it('passes within the rounding tolerance (< 0.005)', () => {
    expect(() => assertJournalBalanced([
      { debit: 100, credit: 0 },
      { debit: 0, credit: 100.004 },
    ])).not.toThrow()
  })

  it('throws when the difference exceeds tolerance', () => {
    expect(() => assertJournalBalanced([
      { debit: 100, credit: 0 },
      { debit: 0, credit: 90 },
    ])).toThrow()
  })
})

describe('normalBalance', () => {
  it('returns debit for assets and expenses', () => {
    expect(normalBalance('asset')).toBe('debit')
    expect(normalBalance('expense')).toBe('debit')
  })

  it('returns credit for liabilities, equity and revenue', () => {
    const creditTypes: AccountType[] = ['liability', 'equity', 'revenue']
    for (const t of creditTypes) expect(normalBalance(t)).toBe('credit')
  })
})

describe('getAccountBalance', () => {
  it('computes debit-normal balance as debits minus credits', () => {
    const account = { normal_balance: 'debit' } as Account
    expect(getAccountBalance(account, 500, 200)).toBe(300)
  })

  it('computes credit-normal balance as credits minus debits', () => {
    const account = { normal_balance: 'credit' } as Account
    expect(getAccountBalance(account, 200, 500)).toBe(300)
  })
})
