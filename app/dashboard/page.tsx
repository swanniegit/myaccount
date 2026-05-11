'use client'
import { useEffect, useState } from 'react'
import Link from 'next/link'
import { supabase } from '@/lib/supabase'
import { formatMoney, formatDate } from '@/lib/utils'
import Button from '@/components/ui/Button'
import {
  LineChart, Line, BarChart, Bar, XAxis, YAxis, Tooltip,
  ResponsiveContainer, CartesianGrid,
} from 'recharts'

interface KPI {
  cash: number
  ar: number
  ap: number
  vat: number
}

interface CashFlowPoint { date: string; in: number; out: number }
interface IncomeExpensePoint { month: string; income: number; expense: number }

interface ActivityItem {
  time: string
  description: string
  amount: number
  side: 'Dr' | 'Cr'
}

const NEEDS_YOU = [
  '4 receipts to file',
  '2 unreconciled (FNB)',
  'VAT 201 ready to review',
  'INV-098 overdue 22d',
]

export default function DashboardPage() {
  const [kpi, setKpi] = useState<KPI>({ cash: 0, ar: 0, ap: 0, vat: 0 })
  const [activity, setActivity] = useState<ActivityItem[]>([])
  const [loading, setLoading] = useState(true)
  const [cashFlow, setCashFlow] = useState<CashFlowPoint[]>([])
  const [incomeExpense, setIncomeExpense] = useState<IncomeExpensePoint[]>([])

  useEffect(() => {
    async function load() {
      try {
        // KPIs + charts computed server-side (batches all journal lines, bypasses 1000-row limit)
        const [kpiRes, chartsRes] = await Promise.all([fetch('/api/kpi'), fetch('/api/charts')])
        if (kpiRes.ok) {
          const data = await kpiRes.json()
          setKpi({ cash: data.cash, ar: data.ar, ap: data.ap, vat: data.vat })
        }
        if (chartsRes.ok) {
          const data = await chartsRes.json()
          setCashFlow(data.cashFlow ?? [])
          setIncomeExpense(data.incomeExpense ?? [])
        }

        const { data: recentLines } = await supabase
          .from('acct_journal_lines')
          .select('debit, credit, description, created_at, acct_journal_entries(description, created_at)')
          .order('created_at', { ascending: false })
          .limit(4)

        if (recentLines) {
          setActivity(
            recentLines.map(l => ({
              time: new Date(l.created_at).toLocaleTimeString('en-ZA', {
                hour: '2-digit',
                minute: '2-digit',
              }),
              description: (l as any).acct_journal_entries?.description ?? l.description ?? '—',
              amount: Number(l.debit || l.credit),
              side: l.debit > 0 ? 'Dr' : 'Cr',
            }))
          )
        }
      } finally {
        setLoading(false)
      }
    }
    load()
  }, [])

  return (
    <div className="p-5 max-w-5xl">
      {/* Header row */}
      <div className="flex items-start justify-between mb-4">
        <div>
          <h1 className="text-2xl font-semibold" style={{ color: 'var(--ink)' }}>
            Dashboard
          </h1>
          <p className="text-xs mt-0.5" style={{ color: 'var(--ink-2)' }}>
            Books up-to-date · 47 accounts · last entry{' '}
            {new Date().toLocaleDateString('en-ZA', { day: '2-digit', month: '2-digit' })}
          </p>
        </div>
        <div className="flex gap-2">
          <Button variant="secondary" size="sm">+ Quote</Button>
          <Button variant="secondary" size="sm">+ Invoice</Button>
          <Button variant="secondary" size="sm">+ Bill</Button>
          <Button size="sm" as={Link} href="/journal">+ Journal entry</Button>
        </div>
      </div>

      {/* KPI cards */}
      <div className="grid grid-cols-4 gap-3 mb-4">
        <KPICard
          label="Cash on hand"
          value={kpi.cash}
          sub="+12% vs Feb"
          loading={loading}
        />
        <KPICard
          label="Money owed to me"
          value={kpi.ar}
          sub="3 overdue"
          loading={loading}
        />
        <KPICard
          label="I owe"
          value={kpi.ap}
          sub="due Fri"
          loading={loading}
        />
        <KPICard
          label="VAT 201 to SARS"
          value={kpi.vat}
          sub="due 25 May · 14d"
          loading={loading}
          accent
        />
      </div>

      {/* Charts row */}
      <div className="grid grid-cols-3 gap-3 mb-4">
        <div
          className="col-span-2 rounded-lg p-4"
          style={{ background: 'var(--surface)', border: '1px solid var(--paper-edge)' }}
        >
          <div className="flex justify-between items-center mb-3">
            <span className="text-sm font-medium">Cash flow — last 30 days</span>
            <button
              className="text-xs px-2 py-1 rounded"
              style={{ border: '1px solid var(--paper-edge)', color: 'var(--ink-2)' }}
            >
              30d ▾
            </button>
          </div>
          {loading || cashFlow.length === 0 ? (
            <div className="h-32 rounded animate-pulse" style={{ background: 'var(--paper-edge)' }} />
          ) : (
            <ResponsiveContainer width="100%" height={128}>
              <LineChart data={cashFlow} margin={{ top: 4, right: 4, left: -24, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="var(--paper-edge)" />
                <XAxis dataKey="date" tick={{ fontSize: 10, fill: 'var(--ink-2)' }} tickLine={false} interval="preserveStartEnd" />
                <YAxis tick={{ fontSize: 10, fill: 'var(--ink-2)' }} tickLine={false} axisLine={false}
                  tickFormatter={(v: number) => v >= 1000 ? `${(v / 1000).toFixed(0)}k` : String(v)} />
                <Tooltip
                  contentStyle={{ fontSize: 11, border: '1px solid var(--paper-edge)', background: 'var(--surface)' }}
                  formatter={(v: number, name: string) => [`R ${v.toLocaleString('en-ZA', { minimumFractionDigits: 2 })}`, name === 'in' ? 'Money in' : 'Money out']}
                />
                <Line type="monotone" dataKey="in" stroke="var(--positive)" strokeWidth={1.5} dot={false} />
                <Line type="monotone" dataKey="out" stroke="var(--accent)" strokeWidth={1.5} dot={false} />
              </LineChart>
            </ResponsiveContainer>
          )}
        </div>
        <div
          className="rounded-lg p-4"
          style={{ background: 'var(--surface)', border: '1px solid var(--paper-edge)' }}
        >
          <div className="text-sm font-medium mb-3">Income vs expense</div>
          {loading || incomeExpense.length === 0 ? (
            <div className="h-32 rounded animate-pulse" style={{ background: 'var(--paper-edge)' }} />
          ) : (
            <ResponsiveContainer width="100%" height={128}>
              <BarChart data={incomeExpense} margin={{ top: 4, right: 4, left: -24, bottom: 0 }} barCategoryGap="30%">
                <CartesianGrid strokeDasharray="3 3" stroke="var(--paper-edge)" vertical={false} />
                <XAxis dataKey="month" tick={{ fontSize: 10, fill: 'var(--ink-2)' }} tickLine={false} />
                <YAxis tick={{ fontSize: 10, fill: 'var(--ink-2)' }} tickLine={false} axisLine={false}
                  tickFormatter={(v: number) => v >= 1000 ? `${(v / 1000).toFixed(0)}k` : String(v)} />
                <Tooltip
                  contentStyle={{ fontSize: 11, border: '1px solid var(--paper-edge)', background: 'var(--surface)' }}
                  formatter={(v: number, name: string) => [`R ${v.toLocaleString('en-ZA', { minimumFractionDigits: 2 })}`, name === 'income' ? 'Income' : 'Expense']}
                />
                <Bar dataKey="income" fill="var(--positive)" radius={[2, 2, 0, 0]} />
                <Bar dataKey="expense" fill="var(--accent)" radius={[2, 2, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          )}
        </div>
      </div>

      {/* Bottom row */}
      <div className="grid grid-cols-3 gap-3">
        {/* Needs you */}
        <div
          className="rounded-lg p-4"
          style={{ background: 'var(--surface)', border: '1px solid var(--paper-edge)' }}
        >
          <div className="text-sm font-medium mb-3">Needs you</div>
          {NEEDS_YOU.map((item, i) => (
            <div
              key={i}
              className="flex justify-between items-center py-2 cursor-pointer hover:opacity-70"
              style={{ borderBottom: '1px dotted var(--paper-edge)', fontSize: 12, color: 'var(--ink-2)' }}
            >
              <span>{item}</span>
              <span style={{ color: 'var(--muted)' }}>›</span>
            </div>
          ))}
        </div>

        {/* Recent activity */}
        <div
          className="rounded-lg p-4"
          style={{ background: 'var(--surface)', border: '1px solid var(--paper-edge)' }}
        >
          <div className="text-sm font-medium mb-3">Recent activity</div>
          {loading ? (
            <div className="space-y-2">
              {[...Array(4)].map((_, i) => (
                <div key={i} className="h-4 rounded animate-pulse" style={{ background: 'var(--paper-edge)' }} />
              ))}
            </div>
          ) : activity.length === 0 ? (
            <p className="text-xs" style={{ color: 'var(--muted)' }}>No entries yet</p>
          ) : (
            activity.map((item, i) => (
              <div
                key={i}
                className="grid gap-1 py-1.5"
                style={{
                  gridTemplateColumns: '38px 1fr auto',
                  borderBottom: '1px dotted var(--paper-edge)',
                  fontSize: 12,
                }}
              >
                <span className="font-mono text-2xs" style={{ color: 'var(--muted)' }}>
                  {item.time}
                </span>
                <span style={{ color: 'var(--ink-2)' }}>{item.description}</span>
                <span
                  className="font-mono text-2xs"
                  style={{ color: item.side === 'Cr' ? 'var(--accent)' : 'var(--ink)' }}
                >
                  {formatMoney(item.amount)} {item.side}
                </span>
              </div>
            ))
          )}
        </div>

        {/* SARS reminder */}
        <div
          className="rounded-lg p-4"
          style={{ background: 'var(--accent-soft)', border: '1px solid var(--accent)' }}
        >
          <div className="text-xs font-medium mb-1" style={{ color: 'var(--accent)' }}>
            SARS reminder
          </div>
          <div
            className="font-mono font-bold mb-1"
            style={{ fontSize: 30, color: 'var(--ink)', lineHeight: 1.1 }}
          >
            {loading ? '—' : formatMoney(kpi.vat)}
          </div>
          <div className="text-xs mb-3" style={{ color: 'var(--ink-2)' }}>
            VAT 201 owing · period 202603
          </div>
          <Link
            href="/vat"
            className="inline-flex items-center gap-1 px-3 py-1.5 rounded text-xs font-medium text-white"
            style={{ background: 'var(--accent)' }}
          >
            Review &amp; file →
          </Link>
          <p className="text-xs mt-3" style={{ color: 'var(--ink-2)' }}>
            also tracking: PAYE 5 Apr · EMP201 due 7 Apr
          </p>
        </div>
      </div>
    </div>
  )
}

function KPICard({
  label,
  value,
  sub,
  loading,
  accent,
}: {
  label: string
  value: number
  sub: string
  loading: boolean
  accent?: boolean
}) {
  return (
    <div
      className="rounded-lg p-3"
      style={{
        background: accent ? 'var(--accent-soft)' : 'var(--surface)',
        border: `1px solid ${accent ? 'var(--accent)' : 'var(--paper-edge)'}`,
      }}
    >
      <div className="text-xs mb-1" style={{ color: 'var(--ink-2)' }}>
        {label}
      </div>
      {loading ? (
        <div className="h-7 w-28 rounded animate-pulse" style={{ background: 'var(--paper-edge)' }} />
      ) : (
        <div className="font-mono font-bold text-xl" style={{ color: 'var(--ink)' }}>
          {formatMoney(value)}
        </div>
      )}
      <div className="text-xs mt-1" style={{ color: accent ? 'var(--accent)' : 'var(--ink-2)' }}>
        {sub}
      </div>
    </div>
  )
}
