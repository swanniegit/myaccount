'use client'
import { useEffect, useState } from 'react'
import type { Period } from '@/lib/types'

function currentFiscalYear() {
  return new Date().getFullYear()
}

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
  const [yeYear, setYeYear] = useState(currentFiscalYear())
  const [yeRunning, setYeRunning] = useState(false)
  const [yeResult, setYeResult] = useState<string | null>(null)
  const [yeError, setYeError] = useState<string | null>(null)

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

  async function runYearEnd() {
    setYeRunning(true)
    setYeResult(null)
    setYeError(null)
    try {
      const res = await fetch('/api/year-end/close', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ fiscal_year: yeYear }),
      })
      const data = await res.json()
      if (!res.ok) {
        setYeError(data.error ?? 'Year-end close failed')
      } else {
        setYeResult(
          `FY${data.fiscal_year} closed. Revenue R ${Number(data.total_revenue).toLocaleString('en-ZA', { minimumFractionDigits: 2 })}, ` +
          `Expenses R ${Number(data.total_expenses).toLocaleString('en-ZA', { minimumFractionDigits: 2 })}, ` +
          `Net R ${Number(data.net_profit).toLocaleString('en-ZA', { minimumFractionDigits: 2 })}.`
        )
        await load()
      }
    } catch (e: unknown) {
      setYeError(e instanceof Error ? e.message : String(e))
    } finally {
      setYeRunning(false)
    }
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

      <div className="mt-8">
        <h2 className="text-base font-semibold mb-1">Year-end close</h2>
        <p className="text-xs text-ink-2 mb-4">
          Closes all revenue and expense accounts into 3300 (Current Year Earnings), rolls 3300 into 3100 (Retained Earnings), and locks all FY periods. Cannot be undone without reversing the closing journals.
        </p>

        {yeResult && (
          <div className="mb-3 px-3 py-2 text-xs rounded"
            style={{ background: 'var(--positive-soft, #dcfce7)', color: 'var(--positive, #16a34a)', border: '1px solid var(--positive, #16a34a)' }}>
            {yeResult}
          </div>
        )}
        {yeError && (
          <div className="mb-3 px-3 py-2 text-xs rounded"
            style={{ background: 'var(--accent-soft)', color: 'var(--negative)', border: '1px solid var(--negative)' }}>
            {yeError}
          </div>
        )}

        <div className="card p-4 flex items-end gap-4">
          <div>
            <label className="text-xs text-ink-2 block mb-1">Fiscal year</label>
            <input
              type="number"
              value={yeYear}
              onChange={e => setYeYear(Number(e.target.value))}
              className="input text-xs py-1 px-2 w-24"
              min={2000}
              max={2100}
            />
          </div>
          <button
            className="btn btn-secondary text-xs"
            disabled={yeRunning}
            onClick={() => {
              if (!confirm(`Run year-end close for FY${yeYear}? This will post closing journals and lock all FY periods. This cannot be undone without manual reversal.`)) return
              runYearEnd()
            }}
          >
            {yeRunning ? 'Running…' : `Close FY${yeYear}`}
          </button>
        </div>
      </div>
    </div>
  )
}
