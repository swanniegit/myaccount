import { round2 } from '@/lib/utils'

/** A single imported bank line. `amount` is signed: positive = money in (credit), negative = money out (debit). */
export interface BankTxnInput {
  date: string          // ISO YYYY-MM-DD
  description: string
  amount: number
}

export interface ParsedStatement {
  accountNumber: string | null
  closingBalance: number | null
  transactions: BankTxnInput[]
  errors: string[]
}

const DATE_RE = /^(\d{4})[/-](\d{2})[/-](\d{2})$/

/** Strip thousands separators / currency chars, then parse. Returns null if not a number. */
function parseAmount(raw: string): number | null {
  const cleaned = raw.replace(/[^0-9.\-]/g, '')
  if (cleaned === '' || cleaned === '-') return null
  const n = Number(cleaned)
  return Number.isFinite(n) ? round2(n) : null
}

/** Normalise a metadata label cell like "Account:" → "account". */
function tagOf(cell: string): string {
  return cell.trim().toLowerCase().replace(/:$/, '')
}

/**
 * Parse an FNB "Account Transaction History" CSV export (already split into a
 * row matrix by parseCsv) into bank transactions.
 *
 * Layout: a metadata block (Name / Account / Balance rows), then a header row
 * `Date, Amount, Balance, Description`, then one signed-amount row per txn
 * (negative = money out, positive = money in). Columns are matched by header
 * name, so column order/extra columns don't matter.
 */
export function parseStatementCsv(rows: string[][]): ParsedStatement {
  const errors: string[] = []
  let accountNumber: string | null = null
  let closingBalance: number | null = null
  let headerRow = -1
  let col = { date: -1, amount: -1, description: -1 }

  for (let i = 0; i < rows.length; i++) {
    const cells = rows[i]
    const tag = tagOf(cells[0] ?? '')

    if (tag === 'account' && cells[1]) { accountNumber = cells[1].trim() || null; continue }
    if (tag === 'balance' && cells[1]) { closingBalance = parseAmount(cells[1]); continue }

    const lower = cells.map(c => c.trim().toLowerCase())
    if (lower.includes('date') && lower.includes('amount') && lower.includes('description')) {
      headerRow = i
      col = { date: lower.indexOf('date'), amount: lower.indexOf('amount'), description: lower.indexOf('description') }
    }
  }

  if (headerRow === -1) {
    return {
      accountNumber, closingBalance, transactions: [],
      errors: ['Could not find a "Date, Amount, Description" header row — is this an FNB transaction CSV?'],
    }
  }

  const transactions: BankTxnInput[] = []
  for (let r = headerRow + 1; r < rows.length; r++) {
    const row = rows[r]
    const rawDate = (row[col.date] ?? '').trim()
    const rawAmount = (row[col.amount] ?? '').trim()
    const description = (row[col.description] ?? '').trim().replace(/\s{2,}/g, ' ')

    if (!rawDate && !rawAmount && !description) continue   // blank row

    const m = rawDate.match(DATE_RE)
    if (!m) { errors.push(`Row ${r + 1}: unrecognised date "${rawDate}"`); continue }

    const amount = parseAmount(rawAmount)
    if (amount === null) { errors.push(`Row ${r + 1}: unrecognised amount "${rawAmount}"`); continue }

    transactions.push({
      date: `${m[1]}-${m[2]}-${m[3]}`,
      description: description || (amount < 0 ? 'Payment' : 'Deposit'),
      amount,
    })
  }

  return { accountNumber, closingBalance, transactions, errors }
}
