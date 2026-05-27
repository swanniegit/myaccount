import { describe, it, expect } from 'vitest'
import { buildExportRows, type ExportEntry, type ExportLine } from '@/lib/export/transactional'

const entries: ExportEntry[] = [
  { id: 'e1', date: '2026-05-10', journal_number: 2, reference: 'R2', source: 'manual', description: 'Entry 2' },
  { id: 'e2', date: '2026-05-01', journal_number: 1, reference: null, source: 'invoice', description: 'Entry 1' },
]
const lines: ExportLine[] = [
  { entry_id: 'e1', debit: 100, credit: 0, description: 'line a', created_at: '2026-05-10T10:00:00Z', acct_accounts: { code: '1000', name: 'Bank' } },
  { entry_id: 'e2', debit: 0, credit: 50, description: null, created_at: '2026-05-01T09:00:00Z', acct_accounts: { code: '4000', name: 'Sales' } },
  { entry_id: 'e2', debit: 50, credit: 0, description: 'first', created_at: '2026-05-01T08:00:00Z', acct_accounts: null },
]

describe('buildExportRows', () => {
  it('sorts by date, then journal number, then line posting order', () => {
    const rows = buildExportRows(entries, lines)
    expect(rows.map(r => r[0])).toEqual(['2026-05-01', '2026-05-01', '2026-05-10'])
    expect(rows[0][4]).toBe('first')      // earliest line in e2 (08:00)
    expect(rows[1][4]).toBe('Entry 1')    // null line description falls back to entry description
  })

  it('formats debit/credit to 2 decimals and handles a null account', () => {
    const rows = buildExportRows(entries, lines)
    expect(rows[0][2]).toBe('')           // null acct_accounts -> empty code
    expect(rows[0][5]).toBe('50.00')      // debit
    expect(rows[0][6]).toBe('0.00')       // credit
  })
})
