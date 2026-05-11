'use client'
import { useEffect, useState } from 'react'
import Link from 'next/link'
import { LineChart, Line, ResponsiveContainer } from 'recharts'
import { formatMoney } from '@/lib/utils'

interface Summary {
  overdueCount: number
  overdueAmount: number
  cashSparkline: { d: string; v: number }[]
  profitSparkline: { d: string; v: number }[]
  arSparkline: { d: string; v: number }[]
}

interface KPI { cash: number; ar: number; profit: number }

const STANDARD = [
  { label: 'Trial balance',     href: '/reports/trial-balance' },
  { label: 'Income statement',  href: '/reports/income-statement' },
  { label: 'Balance sheet',     href: '/reports/balance-sheet' },
  { label: 'Cash flow',         href: '/reports/cash-flow' },
  { label: 'Equity changes',    href: '/reports/equity' },
  { label: 'General ledger',    href: '/ledger' },
  { label: 'VAT detail',        href: '/vat' },
  { label: 'PAYE summary',      href: '/reports/paye' },
]

export default function ReportsPage() {
  const [summary, setSummary] = useState<Summary | null>(null)
  const [kpi, setKpi] = useState<KPI | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    Promise.all([fetch('/api/kpi'), fetch('/api/reports-summary')])
      .then(([k, s]) => Promise.all([k.json(), s.json()]))
      .then(([kData, sData]) => {
        setKpi({ cash: kData.cash, ar: kData.ar, profit: kData.profit })
        setSummary(sData)
      })
      .finally(() => setLoading(false))
  }, [])

  const vatDueDate = '25 May'
  const isVatUrgent = true

  const pinned = [
    {
      label: 'Income statement',
      sub: loading ? '…' : `Profit ${kpi && kpi.profit < 0 ? '–' : ''}${formatMoney(Math.abs(kpi?.profit ?? 0))}`,
      accent: kpi && kpi.profit < 0 ? 'var(--accent)' : 'var(--positive)',
      href: '/reports/income-statement',
      sparkData: summary?.profitSparkline ?? [],
      sparkKey: 'v',
      sparkColor: kpi && kpi.profit < 0 ? 'var(--accent)' : 'var(--positive)',
    },
    {
      label: 'Cash position',
      sub: loading ? '…' : formatMoney(kpi?.cash ?? 0),
      accent: 'var(--ink-2)',
      href: '/reports/cash-flow',
      sparkData: summary?.cashSparkline ?? [],
      sparkKey: 'v',
      sparkColor: 'var(--ink)',
    },
    {
      label: 'Customer aging',
      sub: loading ? '…' : `${summary?.overdueCount ?? 0} overdue · ${formatMoney(summary?.overdueAmount ?? 0)}`,
      accent: 'var(--ink-2)',
      href: '/customers',
      sparkData: summary?.arSparkline ?? [],
      sparkKey: 'v',
      sparkColor: 'var(--accent)',
    },
  ]

  return (
    <div className="p-5 max-w-4xl">
      <h1 className="text-xl font-semibold mb-0.5">Reports</h1>
      <p className="text-xs mb-6" style={{ color: 'var(--ink-2)' }}>
        Pinned · Statements · SARS pack · Custom
      </p>

      {/* Pinned */}
      <section className="mb-6">
        <div className="text-xs font-medium mb-3">Pinned this month</div>
        <div className="grid grid-cols-3 gap-3">
          {pinned.map(item => (
            <Link
              key={item.label}
              href={item.href}
              className="block rounded-lg p-4 hover:opacity-80 transition-opacity"
              style={{ background: 'var(--surface)', border: '1px solid var(--paper-edge)', textDecoration: 'none' }}
            >
              <div className="text-sm font-medium mb-0.5" style={{ color: 'var(--ink)', fontStyle: 'italic' }}>
                {item.label}
              </div>
              <div className="text-xs mb-3" style={{ color: item.accent }}>
                {item.sub}
              </div>
              {loading || item.sparkData.length === 0 ? (
                <div className="rounded animate-pulse" style={{ height: 48, background: 'var(--paper-edge)' }} />
              ) : (
                <ResponsiveContainer width="100%" height={48}>
                  <LineChart data={item.sparkData} margin={{ top: 2, right: 2, left: 2, bottom: 2 }}>
                    <Line
                      type="monotone"
                      dataKey={item.sparkKey}
                      stroke={item.sparkColor}
                      strokeWidth={1.5}
                      dot={false}
                      isAnimationActive={false}
                    />
                  </LineChart>
                </ResponsiveContainer>
              )}
            </Link>
          ))}
        </div>
      </section>

      {/* Standard statements */}
      <section className="mb-6">
        <div className="text-xs font-medium mb-3">Standard statements</div>
        <div className="grid grid-cols-4 gap-2">
          {STANDARD.map(item => (
            <Link
              key={item.label}
              href={item.href}
              className="block px-3 py-2.5 rounded text-xs hover:opacity-80 transition-opacity"
              style={{
                background: 'var(--surface)',
                border: '1px solid var(--paper-edge)',
                color: 'var(--ink)',
                textDecoration: 'none',
              }}
            >
              {item.label} ›
            </Link>
          ))}
        </div>
      </section>

      {/* SARS submission packs */}
      <section>
        <div className="text-xs font-medium mb-3">SARS submission packs</div>
        <div className="grid grid-cols-3 gap-2">
          <Link
            href="/vat"
            className="block px-3 py-3 rounded hover:opacity-80 transition-opacity"
            style={{ background: 'var(--accent-soft)', border: '1px solid var(--accent)', textDecoration: 'none' }}
          >
            <div className="text-xs font-medium" style={{ color: 'var(--accent)' }}>VAT 201</div>
            <div className="text-xs mt-0.5" style={{ color: 'var(--accent)' }}>due {vatDueDate}</div>
          </Link>
          <Link
            href="/reports/emp201"
            className="block px-3 py-3 rounded hover:opacity-80 transition-opacity"
            style={{ background: 'var(--surface)', border: '1px solid var(--paper-edge)', textDecoration: 'none' }}
          >
            <div className="text-xs font-medium" style={{ color: 'var(--ink)' }}>EMP 201 (PAYE/UIF)</div>
            <div className="text-xs mt-0.5" style={{ color: 'var(--ink-2)' }}>due 7 Apr</div>
          </Link>
          <Link
            href="/reports/it14"
            className="block px-3 py-3 rounded hover:opacity-80 transition-opacity"
            style={{ background: 'var(--surface)', border: '1px solid var(--paper-edge)', textDecoration: 'none' }}
          >
            <div className="text-xs font-medium" style={{ color: 'var(--ink)' }}>IT14 / ITR14 – annual</div>
            <div className="text-xs mt-0.5" style={{ color: 'var(--ink-2)' }}>Feb 2027</div>
          </Link>
        </div>
      </section>
    </div>
  )
}
