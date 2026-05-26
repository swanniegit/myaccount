'use client'
import { useEffect, useState } from 'react'
import Link from 'next/link'
import { supabase } from '@/lib/supabase'
import type { Account } from '@/lib/types'
import MonthPicker, { currentMonth, monthRange } from '@/components/ui/MonthPicker'
import type { MonthValue } from '@/components/ui/MonthPicker'

interface AccRow {
  account: Account
  amount: number
  priorAmount: number
}

const REPORT_TABS = [
  { label: 'Trial Balance',    href: '/reports/trial-balance' },
  { label: 'Income Statement', href: '/reports/income-statement' },
  { label: 'Balance Sheet',    href: '/reports/balance-sheet' },
  { label: 'Cash Flow',        href: '/reports/cash-flow' },
  { label: 'VAT Detail',       href: '/vat' },
]

const MONTHS = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec']

function fyStart(month: MonthValue, taxYearEnd: number): MonthValue {
  const fyStartMonthZero = taxYearEnd % 12
  const fyStartYear = month.month >= fyStartMonthZero ? month.year : month.year - 1
  return { year: fyStartYear, month: fyStartMonthZero }
}

function shiftYearBack(dateStr: string): string {
  return dateStr.replace(/^(\d{4})/, (_, y) => String(parseInt(y) - 1))
}

type Totals = Record<string, { debit: number; credit: number }>

async function fetchPeriodTotals(start: string, end: string): Promise<Totals> {
  const totals: Totals = {}
  const { data: lines, error } = await supabase
    .from('acct_journal_lines')
    .select('account_id, debit, credit, acct_journal_entries!inner(date, is_posted)')
    .eq('acct_journal_entries.is_posted', true)
    .gte('acct_journal_entries.date', start)
    .lt('acct_journal_entries.date', end)
  if (error || !lines) return totals
  for (const l of lines) {
    if (!totals[l.account_id]) totals[l.account_id] = { debit: 0, credit: 0 }
    totals[l.account_id].debit  += Number(l.debit)
    totals[l.account_id].credit += Number(l.credit)
  }
  return totals
}

export default function IncomeStatementPage() {
  const [period, setPeriod]         = useState<MonthValue>(currentMonth())
  const [ytd, setYtd]               = useState(false)
  const [taxYearEnd, setTaxYearEnd] = useState(2)
  const [revenue, setRevenue]       = useState<AccRow[]>([])
  const [cogs, setCogs]             = useState<AccRow[]>([])
  const [expenses, setExpenses]     = useState<AccRow[]>([])
  const [loading, setLoading]       = useState(true)
  const [error, setError]           = useState<string | null>(null)

  useEffect(() => {
    supabase.from('acct_company').select('tax_year_end').maybeSingle().then(({ data }) => {
      if (data?.tax_year_end) setTaxYearEnd(data.tax_year_end)
    })
  }, [])

  useEffect(() => {
    async function load() {
      setLoading(true)
      setError(null)

      const { data: accounts, error: accErr } = await supabase
        .from('acct_accounts')
        .select('*')
        .eq('is_active', true)
        .order('code')

      if (accErr || !accounts) { setError('Failed to load accounts'); setLoading(false); return }

      const rangeStart = ytd ? monthRange(fyStart(period, taxYearEnd)).start : monthRange(period).start
      const rangeEnd   = monthRange(period).end

      const priorStart = shiftYearBack(rangeStart)
      const priorEnd   = shiftYearBack(rangeEnd)

      const [totals, priorTotals] = await Promise.all([
        fetchPeriodTotals(rangeStart, rangeEnd),
        fetchPeriodTotals(priorStart, priorEnd),
      ])

      const rev: AccRow[] = []
      const cg:  AccRow[] = []
      const exp: AccRow[] = []

      for (const acc of accounts) {
        const t  = totals[acc.id]
        const pt = priorTotals[acc.id]
        if (!t && !pt) continue

        function amt(raw: { debit: number; credit: number } | undefined, isRevenue: boolean): number {
          if (!raw) return 0
          return isRevenue
            ? (acc.normal_balance === 'credit' ? raw.credit - raw.debit : raw.debit - raw.credit)
            : (acc.normal_balance === 'debit'  ? raw.debit - raw.credit : raw.credit - raw.debit)
        }

        if (acc.type === 'revenue') {
          const amount      = amt(t,  true)
          const priorAmount = amt(pt, true)
          if (amount !== 0 || priorAmount !== 0) rev.push({ account: acc, amount, priorAmount })
        } else if (acc.type === 'expense') {
          const amount      = amt(t,  false)
          const priorAmount = amt(pt, false)
          if (amount !== 0 || priorAmount !== 0) {
            if (acc.sub_type === 'cogs') cg.push({ account: acc, amount, priorAmount })
            else exp.push({ account: acc, amount, priorAmount })
          }
        }
      }

      setRevenue(rev)
      setCogs(cg)
      setExpenses(exp)
      setLoading(false)
    }
    load()
  }, [period, ytd, taxYearEnd])

  const totalRevenue  = revenue.reduce((s, r) => s + r.amount, 0)
  const totalCogs     = cogs.reduce((s, r) => s + r.amount, 0)
  const grossProfit   = totalRevenue - totalCogs
  const totalExpenses = expenses.reduce((s, r) => s + r.amount, 0)
  const netProfit     = grossProfit - totalExpenses

  const priorRevenue  = revenue.reduce((s, r) => s + r.priorAmount, 0)
  const priorCogs     = cogs.reduce((s, r) => s + r.priorAmount, 0)
  const priorGross    = priorRevenue - priorCogs
  const priorExpenses = expenses.reduce((s, r) => s + r.priorAmount, 0)
  const priorNet      = priorGross - priorExpenses

  const { start, end } = monthRange(period)
  const fyS = ytd ? monthRange(fyStart(period, taxYearEnd)).start : start
  const periodLabel = ytd
    ? `FY YTD: ${new Date(fyS).toLocaleDateString('en-ZA', { day: 'numeric', month: 'short', year: 'numeric' })} – ${new Date(end).toLocaleDateString('en-ZA', { day: 'numeric', month: 'short', year: 'numeric' })}`
    : `${MONTHS[period.month]} ${period.year}`
  const priorLabel = ytd
    ? `Prior FY YTD`
    : `${MONTHS[period.month]} ${period.year - 1}`

  const fmt = (n: number) => n.toLocaleString('en-ZA', { minimumFractionDigits: 2 })
  const fmtNeg = (n: number) => n !== 0 ? `(${fmt(n)})` : '—'

  const SkeletonRows = ({ n, cols }: { n: number; cols: number }) => (
    <>
      {[...Array(n)].map((_, i) => (
        <tr key={i} className="t-row">
          {[...Array(cols)].map((_, j) => (
            <td key={j} className="t-cell"><div className="h-3 rounded animate-pulse bg-paper-edge" /></td>
          ))}
        </tr>
      ))}
    </>
  )

  return (
    <div className="p-5 max-w-4xl">
      <div className="flex items-start justify-between mb-1">
        <div>
          <h1 className="text-xl font-semibold">Reports · Income Statement</h1>
          <p className="text-xs mt-0.5 text-ink-2">{periodLabel} · posted only</p>
        </div>
        <div className="flex gap-2 items-center">
          <MonthPicker value={period} onChange={setPeriod} />
          <button onClick={() => setYtd(v => !v)} className="pill" data-active={ytd}>FY YTD</button>
        </div>
      </div>

      <div className="flex gap-1 mb-4 flex-wrap">
        {REPORT_TABS.map(tab => (
          <Link key={tab.label} href={tab.href} className="pill no-underline" data-active={tab.href === '/reports/income-statement'}>
            {tab.label}
          </Link>
        ))}
      </div>

      {error && (
        <div className="text-xs px-3 py-2 rounded mb-4 text-negative" style={{ background: 'var(--accent-soft)', border: '1px solid var(--negative)' }}>
          {error}
        </div>
      )}

      <div className="card overflow-hidden">
        <table className="w-full text-xs">
          <thead className="t-head">
            <tr>
              <th className="text-left w-16">Code</th>
              <th className="text-left">Account</th>
              <th className="text-right w-32">{periodLabel}</th>
              <th className="text-right w-32 text-ink-2">{priorLabel}</th>
            </tr>
          </thead>
          <tbody>
            {/* Revenue */}
            <tr style={{ background: 'var(--accent-soft)' }}>
              <td colSpan={4} className="px-3 py-1.5 font-semibold text-xs">Revenue</td>
            </tr>
            {loading ? <SkeletonRows n={4} cols={4} /> : revenue.map(r => (
              <tr key={r.account.id} className="t-row">
                <td className="t-cell font-mono text-ink-2">{r.account.code}</td>
                <td className="t-cell">{r.account.name}</td>
                <td className="t-cell num">{r.amount !== 0 ? fmt(r.amount) : '—'}</td>
                <td className="t-cell num text-ink-2" style={{ opacity: 0.6 }}>{r.priorAmount !== 0 ? fmt(r.priorAmount) : '—'}</td>
              </tr>
            ))}
            <tr className="bg-paper-edge border-t border-paper-edge">
              <td /><td className="px-3 py-1.5 font-semibold">Total Revenue</td>
              <td className="px-3 py-1.5 num font-semibold">{loading ? '—' : fmt(totalRevenue)}</td>
              <td className="px-3 py-1.5 num text-ink-2" style={{ opacity: 0.6 }}>{loading ? '—' : fmt(priorRevenue)}</td>
            </tr>

            {/* Cost of Sales */}
            {(loading || cogs.length > 0) && (
              <>
                <tr style={{ background: 'var(--accent-soft)' }}>
                  <td colSpan={4} className="px-3 py-1.5 font-semibold text-xs">Cost of Sales</td>
                </tr>
                {loading ? <SkeletonRows n={2} cols={4} /> : cogs.map(r => (
                  <tr key={r.account.id} className="t-row">
                    <td className="t-cell font-mono text-ink-2">{r.account.code}</td>
                    <td className="t-cell">{r.account.name}</td>
                    <td className="t-cell num">{fmtNeg(r.amount)}</td>
                    <td className="t-cell num text-ink-2" style={{ opacity: 0.6 }}>{fmtNeg(r.priorAmount)}</td>
                  </tr>
                ))}
              </>
            )}

            {/* Gross Profit */}
            <tr style={{ background: 'var(--accent-soft)', borderTop: '2px solid var(--paper-edge)' }}>
              <td /><td className="px-3 py-2 font-bold">Gross Profit</td>
              <td className="px-3 py-2 num font-bold" style={{ color: grossProfit >= 0 ? 'var(--positive)' : 'var(--negative)' }}>
                {loading ? '—' : fmt(grossProfit)}
              </td>
              <td className="px-3 py-2 num font-bold text-ink-2" style={{ opacity: 0.6 }}>
                {loading ? '—' : fmt(priorGross)}
              </td>
            </tr>

            {/* Operating Expenses */}
            <tr style={{ background: 'var(--accent-soft)' }}>
              <td colSpan={4} className="px-3 py-1.5 font-semibold text-xs">Operating Expenses</td>
            </tr>
            {loading ? <SkeletonRows n={6} cols={4} /> : expenses.map(r => (
              <tr key={r.account.id} className="t-row">
                <td className="t-cell font-mono text-ink-2">{r.account.code}</td>
                <td className="t-cell">{r.account.name}</td>
                <td className="t-cell num">{fmtNeg(r.amount)}</td>
                <td className="t-cell num text-ink-2" style={{ opacity: 0.6 }}>{fmtNeg(r.priorAmount)}</td>
              </tr>
            ))}
            <tr className="bg-paper-edge border-t border-paper-edge">
              <td /><td className="px-3 py-1.5 font-semibold">Total Operating Expenses</td>
              <td className="px-3 py-1.5 num font-semibold">{loading ? '—' : fmtNeg(totalExpenses)}</td>
              <td className="px-3 py-1.5 num text-ink-2" style={{ opacity: 0.6 }}>{loading ? '—' : fmtNeg(priorExpenses)}</td>
            </tr>
          </tbody>
          <tfoot>
            <tr style={{ background: netProfit >= 0 ? 'rgba(0,180,100,0.08)' : 'rgba(220,50,50,0.06)', borderTop: '2px solid var(--paper-edge)' }}>
              <td /><td className="px-3 py-2.5 font-bold">{netProfit >= 0 ? 'Net Profit' : 'Net Loss'}</td>
              <td className="px-3 py-2.5 num font-bold" style={{ color: netProfit >= 0 ? 'var(--positive)' : 'var(--negative)' }}>
                {loading ? '—' : fmt(netProfit)}
              </td>
              <td className="px-3 py-2.5 num font-bold text-ink-2" style={{ opacity: 0.6, color: priorNet >= 0 ? 'var(--positive)' : 'var(--negative)' }}>
                {loading ? '—' : fmt(priorNet)}
              </td>
            </tr>
          </tfoot>
        </table>
      </div>
    </div>
  )
}
