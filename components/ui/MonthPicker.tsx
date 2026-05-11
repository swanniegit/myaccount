'use client'

export interface MonthValue {
  year: number
  month: number // 0-indexed
}

const MONTHS = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec']

export function currentMonth(): MonthValue {
  const now = new Date()
  return { year: now.getFullYear(), month: now.getMonth() }
}

export function monthRange(v: MonthValue): { start: string; end: string } {
  const pad = (n: number) => String(n).padStart(2, '0')
  const start = `${v.year}-${pad(v.month + 1)}-01`
  const nextMonth = v.month === 11 ? { year: v.year + 1, month: 0 } : { year: v.year, month: v.month + 1 }
  const end = `${nextMonth.year}-${pad(nextMonth.month + 1)}-01`
  return { start, end }
}

export default function MonthPicker({ value, onChange }: { value: MonthValue; onChange: (v: MonthValue) => void }) {
  const now = new Date()
  const isNow = value.year === now.getFullYear() && value.month === now.getMonth()

  function prev() {
    if (value.month === 0) onChange({ year: value.year - 1, month: 11 })
    else onChange({ year: value.year, month: value.month - 1 })
  }

  function next() {
    if (isNow) return
    if (value.month === 11) onChange({ year: value.year + 1, month: 0 })
    else onChange({ year: value.year, month: value.month + 1 })
  }

  return (
    <div className="flex items-center text-xs rounded overflow-hidden" style={{ border: '1px solid var(--paper-edge)', background: 'var(--surface)' }}>
      <button
        onClick={prev}
        className="px-2 py-1.5"
        style={{ color: 'var(--ink-2)', borderRight: '1px solid var(--paper-edge)' }}
      >
        ←
      </button>
      <span className="px-3 py-1.5 font-mono" style={{ color: 'var(--ink)', minWidth: 72, textAlign: 'center' }}>
        {MONTHS[value.month]} {value.year}
      </span>
      <button
        onClick={next}
        disabled={isNow}
        className="px-2 py-1.5"
        style={{ color: isNow ? 'var(--muted)' : 'var(--ink-2)', borderLeft: '1px solid var(--paper-edge)', cursor: isNow ? 'default' : 'pointer' }}
      >
        →
      </button>
    </div>
  )
}
