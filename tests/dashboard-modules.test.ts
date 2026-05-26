import { describe, it, expect } from 'vitest'
import { GENERAL_LEDGER_MODULE, CUSTOMERS_MODULE } from '@/lib/dashboard/modules'
import type { LauncherModule, LauncherTone } from '@/lib/dashboard/types'

const VALID_TONES: LauncherTone[] = ['txn', 'enquiry', 'report']
const tileCount = (m: LauncherModule) => m.sections.reduce((n, s) => n + s.tiles.length, 0)

describe('launcher module config', () => {
  const modules = { GENERAL_LEDGER_MODULE, CUSTOMERS_MODULE }

  for (const [name, mod] of Object.entries(modules)) {
    describe(name, () => {
      it('has a title and three named sections', () => {
        expect(mod.title.length).toBeGreaterThan(0)
        expect(mod.sections.map(s => s.title)).toEqual(['Transactions', 'Enquiries', 'Reports'])
      })

      it('uses only valid section tones', () => {
        for (const s of mod.sections) expect(VALID_TONES).toContain(s.tone)
      })

      it('gives every tile a non-empty label', () => {
        for (const s of mod.sections)
          for (const t of s.tiles) expect(t.label.length).toBeGreaterThan(0)
      })

      it('uses absolute hrefs (or null)', () => {
        for (const s of mod.sections)
          for (const t of s.tiles)
            if (t.href !== null) expect(t.href.startsWith('/')).toBe(true)
      })

      it('keeps every "soon" tile navigable (no 404)', () => {
        for (const s of mod.sections)
          for (const t of s.tiles)
            if (t.soon) expect(t.href).not.toBeNull()
      })
    })
  }

  it('matches the highlighted tile counts from the PDF (GL 13, Customers 14)', () => {
    expect(tileCount(GENERAL_LEDGER_MODULE)).toBe(13)
    expect(tileCount(CUSTOMERS_MODULE)).toBe(14)
  })
})

describe('GL tiles differentiate shared screens via ?view=', () => {
  const hrefs = GENERAL_LEDGER_MODULE.sections.flatMap(s => s.tiles.map(t => t.href))

  it('routes Cashbook, Cashbook Batches and Bank Reconciliation to distinct banking views', () => {
    expect(hrefs).toContain('/banking?view=cashbook')
    expect(hrefs).toContain('/banking?view=batches')
    expect(hrefs).toContain('/banking?view=reconcile')
  })

  it('routes Journal Batches and Account Transactions to their own views', () => {
    expect(hrefs).toContain('/journal?view=batches')
    expect(hrefs).toContain('/ledger?view=transactions')
  })

  it('only the two parity Bank Reconciliation tiles share an href', () => {
    const counts = hrefs.reduce<Record<string, number>>((m, h) => {
      if (h) m[h] = (m[h] ?? 0) + 1
      return m
    }, {})
    const duplicated = Object.entries(counts).filter(([, n]) => n > 1).map(([h]) => h)
    expect(duplicated).toEqual(['/banking?view=reconcile'])
  })
})
