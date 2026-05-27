export interface AgingBuckets {
  current: number
  d30: number
  d60: number
  d90: number
  total: number
}

export interface AgeableInvoice {
  total: number | string
  due_date: string | null
  date: string
}

const isoDate = (d: Date) => d.toISOString().slice(0, 10)

/**
 * Bucket open invoices by how overdue they are relative to `asOf` (default today),
 * keyed off the effective due date (due_date, falling back to invoice date).
 */
export function ageInvoices(invoices: AgeableInvoice[], asOf: Date = new Date()): AgingBuckets {
  const todayStr = isoDate(asOf)
  const daysAgo = (n: number) => { const d = new Date(asOf); d.setDate(d.getDate() - n); return isoDate(d) }
  const d30 = daysAgo(30)
  const d60 = daysAgo(60)

  const b: AgingBuckets = { current: 0, d30: 0, d60: 0, d90: 0, total: 0 }
  for (const inv of invoices) {
    const eff = inv.due_date ?? inv.date
    const t = Number(inv.total)
    if (eff >= todayStr)   b.current += t
    else if (eff >= d30)   b.d30 += t
    else if (eff >= d60)   b.d60 += t
    else                   b.d90 += t
    b.total += t
  }
  return b
}
