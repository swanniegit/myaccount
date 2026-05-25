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
}

const REPORT_TABS = [
  { label: 'Trial Balance',    href: '/reports/trial-balance' },
  { label: 'Income Statement', href: '/reports/income-statement' },
  { label: 'Balance Sheet',    href: '/reports/balance-sheet' },
  { label: 'Cash Flow',        href: '/reports/cash-flow' },
  { label: 'VAT Detail',       href: '/vat' },
]

const MONTHS = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec']

// taxYearEnd = 1-indexed month (1=Jan, 2=Feb … 12=Dec). Returns 0-indexed MonthValue.
function fyStart(month: MonthValue, taxYearEnd: number): MonthValue {
  const fyStartMonthZero = taxYearEnd % 12   // e.g. taxYearEnd=2 → 2 (March, 0-indexed)
  const fyStartYear = month.month >= fyStartMonthZero ? month.year : month.year - 1
  return { year: fyStartYear, month: fyStartMonthZero }
}

export default function IncomeStatementPage() {
  const [period, setPeriod]       = useState<MonthValue>(currentMonth())
  const [ytd, setYtd]             = useState(false)
  const [taxYearEnd, setTaxYearEnd] = useState(2)  // Feb default (SA standard)
  const [revenue, setRevenue]     = useState<AccRow[]>([])
  const [cogs, setCogs]           = useState<AccRow[]>([])
  const [expenses, setExpenses]   = useState<AccRow[]>([])
  const [loading, setLoading]     = useState(true)
  const [error, setError]         = useState<string | null>(null)

  // Load company tax year end once
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
      const rangeEnd = monthRange(period).end

      const { data: lines, error: lineErr } = await supabase
        .from('acct_journal_lines')
        .select('account_id, debit, credit, acct_journal_entries!inner(date, is_posted)')
        .eq('acct_journal_entries.is_posted', true)
        .gte('acct_journal_entries.date', rangeStart)
        .lt('acct_journal_entries.date', rangeEnd)

      if (lineErr || !lines) { setError('Failed to load journal lines'); setLoading(false); return }

      const totals: Record<string, { debit: number; credit: number }> = {}
      for (const l of lines) {
        if (!totals[l.account_id]) totals[l.account_id] = { debit: 0, credit: 0 }
        totals[l.account_id].debit  += Number(l.debit)
        totals[l.account_id].credit += Number(l.credit)
      }

      const rev: AccRow[] = []
      const cg: AccRow[]  = []
      const exp: AccRow[] = []

      for (const acc of accounts) {
        const t = totals[acc.id]
        if (!t) continue
        if (acc.type === 'revenue') {
          const amount = acc.normal_balance === 'credit' ? t.credit - t.debit : t.debit - t.credit
          if (amount !== 0) rev.push({ account: acc, amount })
        } else if (acc.type === 'expense') {
          const amount = acc.normal_balance === 'debit' ? t.debit - t.credit : t.credit - t.debit
          if (amount !== 0) {
            if (acc.sub_type === 'cogs') cg.push({ account: acc, amount })
            else exp.push({ account: acc, amount })
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

  const { start, end } = monthRange(period)
  const fyS = ytd ? monthRange(fyStart(period, taxYearEnd)).start : start
  const periodLabel = ytd
    ? `FY YTD: ${new Date(fyS).toLocaleDateString('en-ZA', { day: 'numeric', month: 'short', year: 'numeric' })} – ${new Date(end).toLocaleDateString('en-ZA', { day: 'numeric', month: 'short', year: 'numeric' })}`
    : `${MONTHS[period.month]} ${period.year}`

  const SkeletonRows = ({ n }: { n: number }) => (
    <>
      {[...Array(n)].map((_, i) => (
        <tr key={i} className="t-row">
          {[...Array(3)].map((_, j) => (
            <td key={j} className="t-cell"><div className="h-3 rounded animate-pulse bg-paper-edge" /></td>
          ))}
        </tr>
      ))}
    </>
  )

  return (
    <div className="p-5 max-w-3xl">
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
              <th className="text-right w-32">Amount</th>
            </tr>
          </thead>
          <tbody>
            {/* Revenue */}
            <tr style={{ background: 'var(--accent-soft)' }}>
              <td colSpan={3} className="px-3 py-1.5 font-semibold text-xs">Revenue</td>
            </tr>
            {loading ? <SkeletonRows n={4} /> : revenue.map(r => (
              <tr key={r.account.id} className="t-row">
                <td className="t-cell font-mono text-ink-2">{r.account.code}</td>
                <td className="t-cell">{r.account.name}</td>
                <td className="t-cell num">{r.amount.toLocaleString('en-ZA', { minimumFractionDigits: 2 })}</td>
              </tr>
            ))}
            <tr className="bg-paper-edge border-t border-paper-edge">
              <td />
              <td className="px-3 py-1.5 font-semibold">Total Revenue</td>
              <td className="px-3 py-1.5 num font-semibold">{loading ? '—' : totalRevenue.toLocaleString('en-ZA', { minimumFractionDigits: 2 })}</td>
            </tr>

            {/* Cost of Sales */}
            {(loading || cogs.length > 0) && (
              <>
                <tr style={{ background: 'var(--accent-soft)' }}>
                  <td colSpan={3} className="px-3 py-1.5 font-semibold text-xs">Cost of Sales</td>
                </tr>
                {loading ? <SkeletonRows n={2} /> : cogs.map(r => (
                  <tr key={r.account.id} className="t-row">
                    <td className="t-cell font-mono text-ink-2">{r.account.code}</td>
                    <td className="t-cell">{r.account.name}</td>
                    <td className="t-cell num">({r.amount.toLocaleString('en-ZA', { minimumFractionDigits: 2 })})</td>
                  </tr>
                ))}
              </>
            )}

            {/* Gross Profit */}
            <tr style={{ background: 'var(--accent-soft)', borderTop: '2px solid var(--paper-edge)' }}>
              <td />
              <td className="px-3 py-2 font-bold">Gross Profit</td>
              <td className="px-3 py-2 num font-bold" style={{ color: grossProfit >= 0 ? 'var(--positive)' : 'var(--negative)' }}>
                {loading ? '—' : grossProfit.toLocaleString('en-ZA', { minimumFractionDigits: 2 })}
              </td>
            </tr>

            {/* Operating Expenses */}
            <tr style={{ background: 'var(--accent-soft)' }}>
              <td colSpan={3} className="px-3 py-1.5 font-semibold text-xs">Operating Expenses</td>
            </tr>
            {loading ? <SkeletonRows n={6} /> : expenses.map(r => (
              <tr key={r.account.id} className="t-row">
                <td className="t-cell font-mono text-ink-2">{r.account.code}</td>
                <td className="t-cell">{r.account.name}</td>
                <td className="t-cell num">({r.amount.toLocaleString('en-ZA', { minimumFractionDigits: 2 })})</td>
              </tr>
            ))}
            <tr className="bg-paper-edge border-t border-paper-edge">
              <td />
              <td className="px-3 py-1.5 font-semibold">Total Operating Expenses</td>
              <td className="px-3 py-1.5 num font-semibold">({loading ? '—' : totalExpenses.toLocaleString('en-ZA', { minimumFractionDigits: 2 })})</td>
            </tr>
          </tbody>
          <tfoot>
            <tr style={{ background: netProfit >= 0 ? 'rgba(0,180,100,0.08)' : 'rgba(220,50,50,0.06)', borderTop: '2px solid var(--paper-edge)' }}>
              <td />
              <td className="px-3 py-2.5 font-bold">{netProfit >= 0 ? 'Net Profit' : 'Net Loss'}</td>
              <td className="px-3 py-2.5 num font-bold" style={{ color: netProfit >= 0 ? 'var(--positive)' : 'var(--negative)' }}>
                {loading ? '—' : netProfit.toLocaleString('en-ZA', { minimumFractionDigits: 2 })}
              </td>
            </tr>
          </tfoot>
        </table>
      </div>
    </div>
  )
}
