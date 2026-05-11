'use client'
import { monthName } from '@/lib/utils'
import type { PrPeriod } from '@/lib/payroll/types'

export default function PeriodSelector({
  periods,
  value,
  onChange,
}: {
  periods: PrPeriod[]
  value: string
  onChange: (id: string) => void
}) {
  return (
    <select
      value={value}
      onChange={e => onChange(e.target.value)}
      className="text-xs px-2 py-1 rounded border"
      style={{ borderColor: 'var(--paper-edge)', background: 'var(--paper)' }}
    >
      {periods.map(p => (
        <option key={p.id} value={p.id}>
          {monthName(p.month)} {p.year} · {p.status}
        </option>
      ))}
    </select>
  )
}
