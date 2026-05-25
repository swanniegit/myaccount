'use client'
import { useEffect, useState } from 'react'
import type { Period } from '@/lib/types'

const MONTHS = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec']

function monthsBack(n: number): { year: number; month: number }[] {
  const result = []
  const now = new Date()
  for (let i = 0; i < n; i++) {
    const d = new Date(now.getFullYear(), now.getMonth() - i, 1)
    result.push({ year: d.getFullYear(), month: d.getMonth() + 1 })
  }
  return result
}

export default function PeriodsPage() {
  const [periods, setPeriods] = useState<Period[]>([])
  const [loading, setLoading] = useState(true)
  const [busy, setBusy] = useState<string | null>(null)
  const [msg, setMsg] = useState('')

  const rows = monthsBack(18)

  async function load() {
    const res = await fetch('/api/periods')
    const data = await res.json()
    setPeriods(Array.isArray(data) ? data : [])
    setLoading(false)
  }

  useEffect(() => { load() }, [])

  function getPeriod(year: number, month: number) {
    return periods.find(p => p.year === year && p.month === month) ?? null
  }

  async function toggle(year: number, month: number, toStatus: 'open' | 'closed') {
    const key = `${year}-${month}`
    setBusy(key)
    setMsg('')
    const res = await fetch('/api/periods', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ year, month, status: toStatus }),
    })
    const data = await res.json()
    if (!res.ok) {
      setMsg(data.error ?? 'Failed')
    } else {
      setMsg(toStatus === 'closed'
        ? `${MONTHS[month - 1]} ${year} closed.`
        : `${MONTHS[month - 1]} ${year} reopened.`
      )
      await load()
      setTimeout(() => setMsg(''), 3000)
    }
    setBusy(null)
  }

  return (
    <div className="p-5 max-w-2xl">
      <h1 className="text-xl font-semibold mb-1">Settings · Periods</h1>
      <p className="text-xs text-ink-2 mb-4">
        Close a period to prevent new entries being posted to it. Reopen at any time for prior-period corrections.
      </p>

      {msg && (
        <div className="mb-3 px-3 py-1.5 text-xs rounded inline-block"
          style={{ background: 'var(--accent-soft)', color: 'var(--accent)' }}>
          {msg}
        </div>
      )}

      <div className="card overflow-hidden">
        <table className="w-full text-xs">
          <thead className="t-head">
            <tr>
              <th className="text-left">Period</th>
              <th className="text-left">Status</th>
              <th className="text-right">Closed</th>
              <th className="text-right w-28"></th>
            </tr>
          </thead>
          <tbody>
            {rows.map(({ year, month }) => {
              const p = getPeriod(year, month)
              const status = p?.status ?? 'open'
              const key = `${year}-${month}`
              const isBusy = busy === key
              const isClosed = status === 'closed'

              return (
                <tr key={key} className="t-row">
                  <td className="t-cell font-medium">
                    {MONTHS[month - 1]} {year}
                  </td>
                  <td className="t-cell">
                    <span
                      className="px-2 py-0.5 rounded text-[10px] font-medium"
                      style={{
                        background: isClosed ? 'var(--negative-soft, #fee2e2)' : 'var(--positive-soft, #dcfce7)',
                        color: isClosed ? 'var(--negative, #dc2626)' : 'var(--positive, #16a34a)',
                      }}
                    >
                      {isClosed ? 'Closed' : 'Open'}
                    </span>
                  </td>
                  <td className="t-cell text-right text-ink-2">
                    {p?.closed_at ? new Date(p.closed_at).toLocaleDateString('en-ZA') : '—'}
                  </td>
                  <td className="t-cell text-right">
                    {loading ? null : (
                      <button
                        className={`btn text-xs ${isClosed ? 'btn-ghost' : 'btn-secondary'}`}
                        disabled={isBusy}
                        onClick={() => toggle(year, month, isClosed ? 'open' : 'closed')}
                      >
                        {isBusy ? '…' : isClosed ? 'Reopen' : 'Close'}
                      </button>
                    )}
                  </td>
                </tr>
              )
            })}
          </tbody>
        </table>
      </div>

      <p className="text-[10px] text-ink-2 mt-3">
        Closing a period does not affect data already posted — it only prevents new entries on those dates.
        Import scripts bypass this guard and always write directly.
      </p>
    </div>
  )
}
