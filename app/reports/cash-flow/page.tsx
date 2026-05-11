'use client'
import { useEffect, useState } from 'react'
import Link from 'next/link'
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid } from 'recharts'
import MonthPicker, { currentMonth, monthRange } from '@/components/ui/MonthPicker'
import type { MonthValue } from '@/components/ui/MonthPicker'

interface CashFlowRow {
  date: string
  in: number
  out: number
}

const REPORT_TABS = [
  { label: 'Trial Balance',    href: '/reports/trial-balance' },
  { label: 'Income Statement', href: '/reports/income-statement' },
  { label: 'Balance Sheet',    href: '/reports/balance-sheet' },
  { label: 'Cash Flow',        href: '/reports/cash-flow' },
  { label: 'VAT Detail',       href: '/vat' },
]

const MONTHS = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec']

function fyStart(month: MonthValue): MonthValue {
  const fyEndMonth = 1
  if (month.month >= fyEndMonth) return { year: month.year, month: fyEndMonth }
  return { year: month.year - 1, month: fyEndMonth }
}

export default function CashFlowPage() {
  const [period, setPeriod] = useState<MonthValue>(currentMonth())
  const [ytd, setYtd] = useState(false)
  const [data, setData] = useState<CashFlowRow[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    async function load() {
      setLoading(true)
      setError(null)

      const rangeStart = ytd ? monthRange(fyStart(period)).start : monthRange(period).start
      const rangeEnd   = monthRange(period).end

      try {
        const res = await fetch(`/api/charts?start=${rangeStart}&end=${rangeEnd}&monthly=${ytd ? '1' : '0'}`)
        if (!res.ok) throw new Error('API error')
        const json = await res.json()
        setData(json.cashFlow ?? [])
      } catch {
        setError('Failed to load cash flow data')
      } finally {
        setLoading(false)
      }
    }
    load()
  }, [period, ytd])

  const totalIn  = data.reduce((s, r) => s + r.in, 0)
  const totalOut = data.reduce((s, r) => s + r.out, 0)
  const net      = totalIn - totalOut

  const periodLabel = ytd
    ? `FY YTD to ${MONTHS[period.month]} ${period.year}`
    : `${MONTHS[period.month]} ${period.year}`

  return (
    <div className="p-5 max-w-4xl">
      <div className="flex items-start justify-between mb-1">
        <div>
          <h1 className="text-xl font-semibold">Reports · Cash Flow</h1>
          <p className="text-xs mt-0.5" style={{ color: 'var(--ink-2)' }}>{periodLabel}</p>
        </div>
        <div className="flex gap-2 items-center">
          <MonthPicker value={period} onChange={setPeriod} />
          <button
            onClick={() => setYtd(v => !v)}
            className="px-3 py-1.5 text-xs rounded"
            style={{
              border: ytd ? '1.5px solid var(--ink)' : '1px solid var(--paper-edge)',
              color: ytd ? 'var(--ink)' : 'var(--ink-2)',
              background: ytd ? 'var(--surface)' : 'transparent',
              borderRadius: 999,
            }}
          >
            FY YTD
          </button>
        </div>
      </div>

      <div className="flex gap-1 mb-4 flex-wrap">
        {REPORT_TABS.map(tab => (
          <Link
            key={tab.label}
            href={tab.href}
            className="px-3 py-1 text-xs rounded font-medium"
            style={{
              background: tab.href === '/reports/cash-flow' ? 'var(--ink)' : 'var(--surface)',
              color: tab.href === '/reports/cash-flow' ? '#fff' : 'var(--ink-2)',
              border: `1px solid ${tab.href === '/reports/cash-flow' ? 'var(--ink)' : 'var(--paper-edge)'}`,
              textDecoration: 'none',
            }}
          >
            {tab.label}
          </Link>
        ))}
      </div>

      {error && (
        <div className="text-xs px-3 py-2 rounded mb-4" style={{ background: 'var(--accent-soft)', color: 'var(--negative)', border: '1px solid var(--negative)' }}>
          {error}
        </div>
      )}

      <div className="rounded-lg p-4 mb-4" style={{ background: 'var(--surface)', border: '1px solid var(--paper-edge)' }}>
        {loading ? (
          <div className="rounded animate-pulse" style={{ height: 240, background: 'var(--paper-edge)' }} />
        ) : (
          <ResponsiveContainer width="100%" height={240}>
            <BarChart data={data} margin={{ top: 4, right: 4, left: 4, bottom: 4 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="var(--paper-edge)" vertical={false} />
              <XAxis dataKey="date" tick={{ fontSize: 10, fill: 'var(--ink-2)' }} axisLine={false} tickLine={false} />
              <YAxis
                tick={{ fontSize: 10, fill: 'var(--ink-2)' }}
                axisLine={false}
                tickLine={false}
                tickFormatter={v => `R${(v / 1000).toFixed(0)}k`}
              />
              <Tooltip
                formatter={(value: number, name: string) => [
                  value.toLocaleString('en-ZA', { minimumFractionDigits: 2 }),
                  name === 'in' ? 'Money in' : 'Money out',
                ]}
                contentStyle={{ fontSize: 11, border: '1px solid var(--paper-edge)', background: 'var(--paper)' }}
              />
              <Bar dataKey="in"  name="Money in"  fill="var(--positive)" radius={[3, 3, 0, 0]} />
              <Bar dataKey="out" name="Money out" fill="var(--accent)"   radius={[3, 3, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        )}
      </div>

      <div className="rounded-lg overflow-hidden" style={{ border: '1px solid var(--paper-edge)' }}>
        <table className="w-full text-xs">
          <thead>
            <tr style={{ background: 'var(--paper-edge)' }}>
              <th className="px-3 py-2 text-left font-medium" style={{ color: 'var(--ink-2)' }}>Date</th>
              <th className="px-3 py-2 text-right font-medium w-32" style={{ color: 'var(--positive)' }}>Money in</th>
              <th className="px-3 py-2 text-right font-medium w-32" style={{ color: 'var(--accent)' }}>Money out</th>
              <th className="px-3 py-2 text-right font-medium w-32" style={{ color: 'var(--ink-2)' }}>Net</th>
            </tr>
          </thead>
          <tbody>
            {loading
              ? [...Array(6)].map((_, i) => (
                  <tr key={i} style={{ borderBottom: '1px solid var(--paper-edge)' }}>
                    {[...Array(4)].map((_, j) => (
                      <td key={j} className="px-3 py-2">
                        <div className="h-3 rounded animate-pulse" style={{ background: 'var(--paper-edge)' }} />
                      </td>
                    ))}
                  </tr>
                ))
              : data.map((row, i) => {
                  const rowNet = row.in - row.out
                  return (
                    <tr key={i} style={{ borderBottom: '1px solid var(--paper-edge)', background: 'var(--surface)' }}>
                      <td className="px-3 py-2 font-mono" style={{ color: 'var(--ink-2)' }}>{row.date}</td>
                      <td className="px-3 py-2 font-mono text-right" style={{ color: 'var(--positive)' }}>
                        {row.in > 0 ? row.in.toLocaleString('en-ZA', { minimumFractionDigits: 2 }) : '—'}
                      </td>
                      <td className="px-3 py-2 font-mono text-right" style={{ color: 'var(--accent)' }}>
                        {row.out > 0 ? row.out.toLocaleString('en-ZA', { minimumFractionDigits: 2 }) : '—'}
                      </td>
                      <td
                        className="px-3 py-2 font-mono text-right"
                        style={{ color: rowNet >= 0 ? 'var(--positive)' : 'var(--negative)' }}
                      >
                        {rowNet.toLocaleString('en-ZA', { minimumFractionDigits: 2 })}
                      </td>
                    </tr>
                  )
                })}
          </tbody>
          <tfoot>
            <tr style={{ background: 'var(--accent-soft)', borderTop: '2px solid var(--paper-edge)' }}>
              <td className="px-3 py-2 font-semibold">Totals</td>
              <td className="px-3 py-2 font-mono font-semibold text-right" style={{ color: 'var(--positive)' }}>
                {loading ? '—' : totalIn.toLocaleString('en-ZA', { minimumFractionDigits: 2 })}
              </td>
              <td className="px-3 py-2 font-mono font-semibold text-right" style={{ color: 'var(--accent)' }}>
                {loading ? '—' : totalOut.toLocaleString('en-ZA', { minimumFractionDigits: 2 })}
              </td>
              <td
                className="px-3 py-2 font-mono font-semibold text-right"
                style={{ color: net >= 0 ? 'var(--positive)' : 'var(--negative)' }}
              >
                {loading ? '—' : net.toLocaleString('en-ZA', { minimumFractionDigits: 2 })}
              </td>
            </tr>
          </tfoot>
        </table>
      </div>
    </div>
  )
}
