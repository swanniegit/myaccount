'use client'
import { useEffect, useState } from 'react'
import Link from 'next/link'
import {
  BarChart, Bar, XAxis, YAxis, Tooltip,
  ResponsiveContainer, CartesianGrid,
} from 'recharts'

// ── Types ──────────────────────────────────────────────────────────────────
interface ArAging { current: number; days30: number; days60: number; days90plus: number }
interface KpiData {
  cash: number
  banks: { name: string; balance: number }[]
  ar: number
  arAging: ArAging
  arOverdue: number
  ap: number
  vat: number
  vatPeriod: { from: string; to: string }
}
interface IncomePoint { month: string; income: number; expense: number }

const MONTHS = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec']
const R = (n: number) => `R ${n.toLocaleString('en-ZA', { minimumFractionDigits: 2 })}`
const Rm = (n: number) => `R ${(n / 1000).toFixed(0)}k`

const ZERO_KPI: KpiData = {
  cash: 0, banks: [], ar: 0, arAging: { current: 0, days30: 0, days60: 0, days90plus: 0 },
  arOverdue: 0, ap: 0, vat: 0, vatPeriod: { from: '', to: '' },
}

const CHART_STYLE = { fontSize: 11, border: '1px solid var(--paper-edge)', background: 'var(--surface)' }

// ── Component ──────────────────────────────────────────────────────────────
export default function DashboardPage() {
  const [kpi,     setKpi]     = useState<KpiData>(ZERO_KPI)
  const [ie,      setIe]      = useState<IncomePoint[]>([])
  const [kpiLoad, setKpiLoad] = useState(true)
  const [chLoad,  setChLoad]  = useState(true)

  const today    = new Date()
  const monthStr = `${MONTHS[today.getMonth()]} ${today.getFullYear()}`
  const vatDue   = (() => {
    const d = new Date(today.getFullYear(), today.getMonth() + 1, 25)
    return `25 ${MONTHS[d.getMonth()]} ${d.getFullYear()}`
  })()

  useEffect(() => {
    fetch('/api/kpi')
      .then(r => r.json())
      .then(d => { setKpi(d); setKpiLoad(false) })
      .catch(() => setKpiLoad(false))
  }, [])

  useEffect(() => {
    const now    = new Date()
    const anchor = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-01`
    fetch(`/api/charts?start=${anchor}&monthly=1`)
      .then(r => r.json())
      .then(d => { setIe(d.incomeExpense ?? []); setChLoad(false) })
      .catch(() => setChLoad(false))
  }, [])

  const curMonth    = ie[ie.length - 1]
  const prevMonth   = ie[ie.length - 2]
  const monthIncome  = curMonth?.income  ?? 0
  const monthExpense = curMonth?.expense ?? 0
  const monthProfit  = monthIncome - monthExpense
  const prevProfit   = (prevMonth?.income ?? 0) - (prevMonth?.expense ?? 0)
  const profitTrend  = monthProfit >= prevProfit ? '▲' : '▼'
  const profitColor  = monthProfit >= 0 ? 'var(--positive)' : 'var(--negative)'

  const primaryBank = kpi.banks[0]

  return (
    <div className="p-5 max-w-5xl">

      {/* ── Header ────────────────────────────────────────────────────────── */}
      <div className="flex items-start justify-between mb-5">
        <div>
          <h1 className="text-xl font-semibold">Dashboard</h1>
          <p className="text-xs mt-0.5 text-ink-2">
            {monthStr} · financial period
          </p>
        </div>
        <div className="flex gap-2">
          <Link href="/invoices/new"    className="btn btn-secondary text-xs">+ Invoice</Link>
          <Link href="/journal"         className="btn btn-secondary text-xs">+ Journal entry</Link>
          <Link href="/settings/periods" className="btn btn-ghost    text-xs">Periods</Link>
        </div>
      </div>

      {/* ── KPI tiles ─────────────────────────────────────────────────────── */}
      <div className="grid grid-cols-4 gap-3 mb-4">

        {/* Bank */}
        <div className="card kpi">
          <p className="kpi-label">Cash &amp; Bank</p>
          {kpiLoad
            ? <Skeleton />
            : <p className="kpi-value">{R(kpi.cash)}</p>
          }
          <p className="kpi-sub">
            {primaryBank ? primaryBank.name : 'No bank linked'}
          </p>
        </div>

        {/* Customers / AR */}
        <div className="card kpi">
          <p className="kpi-label">Customers</p>
          {kpiLoad
            ? <Skeleton />
            : <p className="kpi-value">{R(kpi.ar)}</p>
          }
          <p className="kpi-sub" style={{ color: kpi.arOverdue > 0 ? 'var(--negative)' : undefined }}>
            {kpiLoad ? '' : kpi.arOverdue > 0 ? `${kpi.arOverdue} overdue` : 'All current'}
          </p>
        </div>

        {/* Net profit */}
        <div className="card kpi">
          <p className="kpi-label">Net Profit · {monthStr}</p>
          {chLoad
            ? <Skeleton />
            : <p className="kpi-value" style={{ color: profitColor }}>{R(monthProfit)}</p>
          }
          <p className="kpi-sub">
            {chLoad ? '' : `${profitTrend} vs ${MONTHS[(today.getMonth() + 11) % 12]}`}
          </p>
        </div>

        {/* VAT */}
        <div className="card-accent kpi">
          <p className="kpi-label" style={{ color: 'var(--accent)' }}>VAT 201</p>
          {kpiLoad
            ? <Skeleton />
            : <p className="kpi-value" style={{ color: 'var(--accent)' }}>{R(kpi.vat)}</p>
          }
          <p className="kpi-sub" style={{ color: 'var(--accent)' }}>
            due {vatDue}
          </p>
        </div>

      </div>

      {/* ── Charts row ────────────────────────────────────────────────────── */}
      <div className="grid grid-cols-3 gap-3 mb-4">

        {/* Income vs expense bar chart — 2/3 */}
        <div className="col-span-2 card p-4">
          <p className="text-sm font-medium mb-3">Income vs expenses — 6 months</p>
          {chLoad || ie.length === 0
            ? <div className="h-36 rounded animate-pulse bg-paper-edge" />
            : (
              <ResponsiveContainer width="100%" height={144}>
                <BarChart data={ie} margin={{ top: 4, right: 4, left: -24, bottom: 0 }} barCategoryGap="30%">
                  <CartesianGrid strokeDasharray="3 3" stroke="var(--paper-edge)" vertical={false} />
                  <XAxis dataKey="month" tick={{ fontSize: 10, fill: 'var(--ink-2)' }} tickLine={false}
                    tickFormatter={m => MONTHS[parseInt(m.slice(5)) - 1] ?? m} />
                  <YAxis tick={{ fontSize: 10, fill: 'var(--ink-2)' }} tickLine={false} axisLine={false}
                    tickFormatter={(v: number) => v >= 1000 ? Rm(v) : String(v)} />
                  <Tooltip contentStyle={CHART_STYLE}
                    formatter={(v: number, name: string) => [R(v), name === 'income' ? 'Income' : 'Expenses']}
                    labelFormatter={m => MONTHS[parseInt(m.slice(5)) - 1] ?? m} />
                  <Bar dataKey="income"  fill="var(--positive)" radius={[2,2,0,0]} />
                  <Bar dataKey="expense" fill="var(--accent)"   radius={[2,2,0,0]} />
                </BarChart>
              </ResponsiveContainer>
            )
          }
          <div className="flex gap-4 mt-2">
            <Legend color="var(--positive)" label="Income" />
            <Legend color="var(--accent)"   label="Expenses" />
          </div>
        </div>

        {/* Profit summary — 1/3 */}
        <div className="card p-4">
          <p className="text-sm font-medium mb-3">Profit · {monthStr}</p>
          {chLoad
            ? <div className="space-y-2">{[...Array(4)].map((_,i)=><div key={i} className="h-4 rounded animate-pulse bg-paper-edge"/>)}</div>
            : (
              <div className="space-y-2 text-xs">
                <ProfitRow label="Income"   value={monthIncome}  />
                <ProfitRow label="Expenses" value={monthExpense} negative />
                <div style={{ borderTop: '1px solid var(--paper-edge)', paddingTop: 6, marginTop: 6 }}>
                  <ProfitRow label="Net profit" value={monthProfit} bold highlight />
                </div>
                <div className="pt-2" style={{ borderTop: '1px dashed var(--paper-edge)' }}>
                  <p className="text-ink-2 mb-1" style={{ fontSize: 10 }}>YTD (last 6 months)</p>
                  <ProfitRow
                    label="Net profit YTD"
                    value={ie.reduce((s, m) => s + m.income - m.expense, 0)}
                    bold
                  />
                </div>
              </div>
            )
          }
        </div>

      </div>

      {/* ── Bottom row ────────────────────────────────────────────────────── */}
      <div className="grid grid-cols-3 gap-3">

        {/* AR Aging */}
        <div className="card p-4">
          <div className="flex items-center justify-between mb-3">
            <p className="text-sm font-medium">Customers — aged</p>
            <Link href="/reports/trial-balance" className="text-xs text-accent hover:underline">View TB →</Link>
          </div>
          {kpiLoad
            ? <div className="space-y-2">{[...Array(4)].map((_,i)=><div key={i} className="h-4 rounded animate-pulse bg-paper-edge"/>)}</div>
            : (
              <table className="w-full text-xs">
                <tbody>
                  <AgingRow label="Current"   value={kpi.arAging.current}    />
                  <AgingRow label="30 days"   value={kpi.arAging.days30}     warn />
                  <AgingRow label="60 days"   value={kpi.arAging.days60}     warn />
                  <AgingRow label="90+ days"  value={kpi.arAging.days90plus} bad  />
                  <tr style={{ borderTop: '1px solid var(--paper-edge)' }}>
                    <td className="py-1.5 font-semibold">Total</td>
                    <td className="py-1.5 num font-semibold text-right">{R(kpi.ar)}</td>
                  </tr>
                </tbody>
              </table>
            )
          }
        </div>

        {/* Recent activity */}
        <div className="card p-4">
          <div className="flex items-center justify-between mb-3">
            <p className="text-sm font-medium">Recent entries</p>
            <Link href="/journal" className="text-xs text-accent hover:underline">Journal →</Link>
          </div>
          <RecentActivity />
        </div>

        {/* SARS compliance */}
        <div className="card-accent p-4">
          <p className="text-xs font-medium mb-1" style={{ color: 'var(--accent)' }}>SARS · compliance</p>
          <p className="num font-bold mb-0.5" style={{ fontSize: 28, lineHeight: 1.1, color: 'var(--accent)' }}>
            {kpiLoad ? '—' : R(kpi.vat)}
          </p>
          <p className="text-xs mb-3 text-ink-2">VAT 201 · due {vatDue}</p>
          <Link href="/vat" className="btn btn-sm btn-primary">Review &amp; file →</Link>
          <div className="mt-4 pt-3 text-xs space-y-1" style={{ borderTop: '1px dashed rgba(217,119,87,0.35)' }}>
            <p className="font-medium" style={{ color: 'var(--accent)' }}>Reports</p>
            <Link href="/reports/trial-balance"    className="block text-ink-2 hover:text-ink no-underline">Trial Balance →</Link>
            <Link href="/reports/income-statement" className="block text-ink-2 hover:text-ink no-underline">Income Statement →</Link>
            <Link href="/reports/balance-sheet"    className="block text-ink-2 hover:text-ink no-underline">Balance Sheet →</Link>
          </div>
        </div>

      </div>
    </div>
  )
}

// ── Sub-components ──────────────────────────────────────────────────────────

function Skeleton() {
  return <div className="h-7 w-32 rounded animate-pulse bg-paper-edge my-0.5" />
}

function Legend({ color, label }: { color: string; label: string }) {
  return (
    <div className="flex items-center gap-1 text-xs text-ink-2">
      <span className="inline-block w-2.5 h-2.5 rounded-sm" style={{ background: color }} />
      {label}
    </div>
  )
}

function ProfitRow({ label, value, negative, bold, highlight }: {
  label: string; value: number; negative?: boolean; bold?: boolean; highlight?: boolean
}) {
  const color = highlight ? (value >= 0 ? 'var(--positive)' : 'var(--negative)') : undefined
  return (
    <div className="flex justify-between" style={{ fontWeight: bold ? 600 : undefined, color }}>
      <span className={bold ? '' : 'text-ink-2'}>{label}</span>
      <span className="num">
        {negative && value > 0 ? `(${R(value)})` : R(value)}
      </span>
    </div>
  )
}

function AgingRow({ label, value, warn, bad }: { label: string; value: number; warn?: boolean; bad?: boolean }) {
  const color = bad && value > 0 ? 'var(--negative)' : warn && value > 0 ? 'var(--accent)' : undefined
  return (
    <tr>
      <td className="py-1 text-ink-2">{label}</td>
      <td className="py-1 num text-right" style={{ color }}>{R(value)}</td>
    </tr>
  )
}

function RecentActivity() {
  const [items, setItems] = useState<{ time: string; desc: string; amount: number; side: string }[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    import('@/lib/supabase').then(({ supabase }) => {
      supabase
        .from('acct_journal_lines')
        .select('debit, credit, description, created_at, acct_journal_entries(description, date)')
        .order('created_at', { ascending: false })
        .limit(6)
        .then(({ data }) => {
          if (data) setItems(data.map(l => ({
            time:   (l as any).acct_journal_entries?.date ?? l.created_at.slice(0, 10),
            desc:   (l as any).acct_journal_entries?.description ?? l.description ?? '—',
            amount: Number(l.debit || l.credit),
            side:   l.debit > 0 ? 'Dr' : 'Cr',
          })))
          setLoading(false)
        })
    })
  }, [])

  if (loading) return <div className="space-y-2">{[...Array(5)].map((_,i)=><div key={i} className="h-4 rounded animate-pulse bg-paper-edge"/>)}</div>
  if (!items.length) return <p className="text-xs text-ink-2">No entries yet</p>

  return (
    <div className="space-y-0">
      {items.map((item, i) => (
        <div key={i} className="grid py-1.5 text-xs" style={{ gridTemplateColumns: '56px 1fr auto', borderBottom: '1px dotted var(--paper-edge)' }}>
          <span className="text-ink-2" style={{ fontSize: 10 }}>{item.time}</span>
          <span className="text-ink truncate pr-1">{item.desc}</span>
          <span className="num" style={{ fontSize: 10, color: item.side === 'Cr' ? 'var(--positive)' : undefined }}>
            {item.amount.toLocaleString('en-ZA', { minimumFractionDigits: 2 })} {item.side}
          </span>
        </div>
      ))}
    </div>
  )
}
