'use client'

export interface MonthValue { year: number; month: number }

const MONTHS = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec']

export function currentMonth(): MonthValue {
  const now = new Date()
  return { year: now.getFullYear(), month: now.getMonth() }
}

export function monthRange(v: MonthValue): { start: string; end: string } {
  const pad  = (n: number) => String(n).padStart(2, '0')
  const next = v.month === 11 ? { year: v.year + 1, month: 0 } : { year: v.year, month: v.month + 1 }
  return {
    start: `${v.year}-${pad(v.month + 1)}-01`,
    end:   `${next.year}-${pad(next.month + 1)}-01`,
  }
}

export default function MonthPicker({ value, onChange }: { value: MonthValue; onChange: (v: MonthValue) => void }) {
  const now  = new Date()
  const isNow = value.year === now.getFullYear() && value.month === now.getMonth()

  function prev() {
    onChange(value.month === 0
      ? { year: value.year - 1, month: 11 }
      : { year: value.year, month: value.month - 1 })
  }

  function next() {
    if (isNow) return
    onChange(value.month === 11
      ? { year: value.year + 1, month: 0 }
      : { year: value.year, month: value.month + 1 })
  }

  return (
    <div className="month-picker">
      <button className="month-picker-btn" onClick={prev}>&#8249;</button>
      <span className="month-picker-label">{MONTHS[value.month]} {value.year}</span>
      <button className="month-picker-btn" onClick={next} disabled={isNow}>&#8250;</button>
    </div>
  )
}
