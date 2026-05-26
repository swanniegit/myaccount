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
      href: '/customers/listing',
      sparkData: summary?.arSparkline ?? [],
      sparkKey: 'v',
      sparkColor: 'var(--accent)',
    },
  ]

  return (
    <div className="p-5 max-w-4xl">
      <h1 className="text-xl font-semibold mb-0.5">Reports</h1>
      <p className="text-xs mb-6 text-ink-2">Pinned · Statements · SARS pack · Custom</p>

      <section className="mb-6">
        <div className="text-xs font-medium mb-3">Pinned this month</div>
        <div className="grid grid-cols-3 gap-3">
          {pinned.map(item => (
            <Link
              key={item.label}
              href={item.href}
              className="block card p-4 hover:opacity-80 transition-opacity no-underline"
            >
              <div className="text-sm font-medium mb-0.5 italic">{item.label}</div>
              <div className="text-xs mb-3" style={{ color: item.accent }}>{item.sub}</div>
              {loading || item.sparkData.length === 0 ? (
                <div className="h-12 rounded animate-pulse bg-paper-edge" />
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

      <section className="mb-6">
        <div className="text-xs font-medium mb-3">Standard statements</div>
        <div className="grid grid-cols-4 gap-2">
          {STANDARD.map(item => (
            <Link
              key={item.label}
              href={item.href}
              className="block card px-3 py-2.5 text-xs hover:opacity-80 transition-opacity no-underline"
            >
              {item.label} ›
            </Link>
          ))}
        </div>
      </section>

      <section>
        <div className="text-xs font-medium mb-3">SARS submission packs</div>
        <div className="grid grid-cols-3 gap-2">
          <Link href="/vat" className="block card-accent px-3 py-3 hover:opacity-80 transition-opacity no-underline">
            <div className="text-xs font-medium text-accent">VAT 201</div>
            <div className="text-xs mt-0.5 text-accent">due 25 May</div>
          </Link>
          <Link href="/reports/emp201" className="block card px-3 py-3 hover:opacity-80 transition-opacity no-underline">
            <div className="text-xs font-medium">EMP 201 (PAYE/UIF)</div>
            <div className="text-xs mt-0.5 text-ink-2">due 7 Apr</div>
          </Link>
          <Link href="/reports/it14" className="block card px-3 py-3 hover:opacity-80 transition-opacity no-underline">
            <div className="text-xs font-medium">IT14 / ITR14 – annual</div>
            <div className="text-xs mt-0.5 text-ink-2">Feb 2027</div>
          </Link>
        </div>
      </section>
    </div>
  )
}
