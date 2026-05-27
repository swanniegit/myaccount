type Cell = string | number | null | undefined

/** Serialize a row matrix to CSV text (RFC 4180 quoting, CRLF line breaks). */
export function toCsv(rows: Cell[][]): string {
  const esc = (v: Cell) => {
    const s = v == null ? '' : String(v)
    return /[",\n\r]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s
  }
  return rows.map(r => r.map(esc).join(',')).join('\r\n')
}
