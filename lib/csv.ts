type Cell = string | number | null | undefined

/** Serialize a row matrix to CSV text (RFC 4180 quoting, CRLF line breaks). */
export function toCsv(rows: Cell[][]): string {
  const esc = (v: Cell) => {
    const s = v == null ? '' : String(v)
    return /[",\n\r]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s
  }
  return rows.map(r => r.map(esc).join(',')).join('\r\n')
}

/** Parse CSV text into a row matrix. Handles quoted fields, escaped "" quotes, and CRLF/LF. Drops fully-empty rows. */
export function parseCsv(text: string): string[][] {
  const s = text.replace(/\r\n?/g, '\n')
  const rows: string[][] = []
  let row: string[] = []
  let field = ''
  let inQuotes = false

  for (let i = 0; i < s.length; i++) {
    const c = s[i]
    if (inQuotes) {
      if (c === '"') {
        if (s[i + 1] === '"') { field += '"'; i++ }
        else inQuotes = false
      } else {
        field += c
      }
    } else if (c === '"') {
      inQuotes = true
    } else if (c === ',') {
      row.push(field); field = ''
    } else if (c === '\n') {
      row.push(field); rows.push(row); row = []; field = ''
    } else {
      field += c
    }
  }
  if (field !== '' || row.length > 0) { row.push(field); rows.push(row) }

  return rows.filter(r => r.some(cell => cell.trim() !== ''))
}
