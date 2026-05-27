import { describe, it, expect } from 'vitest'
import { toCsv, parseCsv } from '@/lib/csv'

describe('toCsv', () => {
  it('joins cells with commas and rows with CRLF', () => {
    expect(toCsv([['a', 'b'], ['c', 'd']])).toBe('a,b\r\nc,d')
  })

  it('quotes cells containing commas, quotes or newlines', () => {
    expect(toCsv([['a,b', 'c"d', 'e\nf']])).toBe('"a,b","c""d","e\nf"')
  })

  it('renders null/undefined as empty and numbers as-is', () => {
    expect(toCsv([[null, undefined, 12.5]])).toBe(',,12.5')
  })
})

describe('parseCsv', () => {
  it('parses simple rows', () => {
    expect(parseCsv('a,b\nc,d')).toEqual([['a', 'b'], ['c', 'd']])
  })

  it('handles quoted commas, escaped quotes and CRLF', () => {
    expect(parseCsv('"a,b","c""d"\r\ne,f')).toEqual([['a,b', 'c"d'], ['e', 'f']])
  })

  it('drops fully-empty rows (e.g. trailing newline / blank lines)', () => {
    expect(parseCsv('a,b\n\nc,d\n')).toEqual([['a', 'b'], ['c', 'd']])
  })

  it('round-trips with toCsv', () => {
    const rows = [['code', 'name'], ['E1', 'Doe, Jane'], ['E2', 'O"Hara']]
    expect(parseCsv(toCsv(rows))).toEqual(rows)
  })
})
