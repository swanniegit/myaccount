import { describe, it, expect } from 'vitest'
import { parseCsv } from '@/lib/csv'
import { parseStatementCsv } from '@/lib/banking/parse-statement-csv'

const SAMPLE = `ACCOUNT TRANSACTION HISTORY

Name:, Sannette, Swanepoel
Account:, 63044191201, [Hearts In Scrubs]
Balance:, 39167.72, 39161.47

Date, Amount, Balance, Description
2026/06/03, -1284.86, 39167.72, Checkers Sixty60    428104*2505  31 MAY
2026/06/03, 2542.36, 40637.48, YOCO      KD5SP 030626
`

describe('parseStatementCsv', () => {
  it('extracts account number and closing balance from the metadata block', () => {
    const r = parseStatementCsv(parseCsv(SAMPLE))
    expect(r.accountNumber).toBe('63044191201')
    expect(r.closingBalance).toBe(39167.72)
    expect(r.errors).toEqual([])
  })

  it('parses signed amounts and converts YYYY/MM/DD to ISO, collapsing whitespace', () => {
    const r = parseStatementCsv(parseCsv(SAMPLE))
    expect(r.transactions).toHaveLength(2)
    expect(r.transactions[0]).toEqual({
      date: '2026-06-03',
      description: 'Checkers Sixty60 428104*2505 31 MAY',  // runs of spaces collapsed
      amount: -1284.86,                                    // negative = money out
    })
    expect(r.transactions[1].amount).toBe(2542.36)          // positive = money in
  })

  it('reports a row with an unparseable amount and skips it, keeping the rest', () => {
    const rows = parseCsv('Date, Amount, Description\n2026/06/03, abc, Foo\n2026/06/04, -10.00, Bar\n')
    const r = parseStatementCsv(rows)
    expect(r.transactions).toHaveLength(1)
    expect(r.transactions[0].description).toBe('Bar')
    expect(r.errors[0]).toMatch(/unrecognised amount/)
  })

  it('errors clearly when no transaction header is present', () => {
    const r = parseStatementCsv(parseCsv('some, random, file\n1, 2, 3\n'))
    expect(r.transactions).toEqual([])
    expect(r.errors[0]).toMatch(/header row/)
  })
})
