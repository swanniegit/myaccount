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

function fyStart(month: MonthValue): MonthValue {
  const fyEndMonth = 1
  if (month.month >= fyEndMonth) return { year: month.year, month: fyEndMonth }
  return { year: month.year - 1, month: fyEndMonth }
}

export default function IncomeStatementPage() {
  const [period, setPeriod] = useState<MonthValue>(currentMonth())
  const [ytd, setYtd] = useState(false)
  const [revenue, setRevenue] = useState<AccRow[]>([])
  const [expenses, setExpenses] = useState<AccRow[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

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

      const rangeStart = ytd ? monthRange(fyStart(period)).start : monthRange(period).start
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
      const exp: AccRow[] = []

      for (const acc of accounts) {
        const t = totals[acc.id]
        if (!t) continue
        if (acc.type === 'revenue') {
          const amount = acc.normal_balance === 'credit' ? t.credit - t.debit : t.debit - t.credit
          if (amount !== 0) rev.push({ account: acc, amount })
        } else if (acc.type === 'expense') {
          const amount = acc.normal_balance === 'debit' ? t.debit - t.credit : t.credit - t.debit
          if (amount !== 0) exp.push({ account: acc, amount })
        }
      }

      setRevenue(rev)
      setExpenses(exp)
      setLoading(false)
    }
    load()
  }, [period, ytd])

  const totalRevenue  = revenue.reduce((s, r) => s + r.amount, 0)
  const totalExpenses = expenses.reduce((s, r) => s + r.amount, 0)
  const netProfit     = totalRevenue - totalExpenses

  const { start, end } = monthRange(period)
  const fyS = ytd ? monthRange(fyStart(period)).start : start
  const periodLabel = ytd
    ? `FY YTD: ${new Date(fyS).toLocaleDateString('en-ZA', { day: 'numeric', month: 'short', year: 'numeric' })} – ${new Date(end).toLocaleDateString('en-ZA', { day: 'numeric', month: 'short', year: 'numeric' })}`
    : `${MONTHS[period.month]} ${period.year}`

  return (
    <div className="p-5 max-w-3xl">
      <div className="flex items-start justify-between mb-1">
        <div>
          <h1 className="text-xl font-semibold">Reports · Income Statement</h1>
          <p className="text-xs mt-0.5 text-ink-2">{periodLabel}</p>
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
            <tr style={{ background: 'var(--accent-soft)' }}>
              <td colSpan={3} className="px-3 py-1.5 font-semibold text-xs">Revenue</td>
            </tr>
            {loading
              ? [...Array(4)].map((_, i) => (
                  <tr key={i} className="t-row">
                    {[...Array(3)].map((_, j) => (
                      <td key={j} className="t-cell">
                        <div className="h-3 rounded animate-pulse bg-paper-edge" />
                      </td>
                    ))}
                  </tr>
                ))
              : revenue.map(r => (
                  <tr key={r.account.id} className="t-row">
                    <td className="t-cell font-mono text-ink-2">{r.account.code}</td>
                    <td className="t-cell">{r.account.name}</td>
                    <td className="t-cell num">{r.amount.toLocaleString('en-ZA', { minimumFractionDigits: 2 })}</td>
                  </tr>
                ))}
            <tr className="bg-paper-edge border-t-2 border-paper-edge">
              <td />
              <td className="px-3 py-2 font-semibold">Total Revenue</td>
              <td className="px-3 py-2 num font-semibold">{loading ? '—' : totalRevenue.toLocaleString('en-ZA', { minimumFractionDigits: 2 })}</td>
            </tr>

            <tr style={{ background: 'var(--accent-soft)' }}>
              <td colSpan={3} className="px-3 py-1.5 font-semibold text-xs">Expenses</td>
            </tr>
            {loading
              ? [...Array(6)].map((_, i) => (
                  <tr key={i} className="t-row">
                    {[...Array(3)].map((_, j) => (
                      <td key={j} className="t-cell">
                        <div className="h-3 rounded animate-pulse bg-paper-edge" />
                      </td>
                    ))}
                  </tr>
                ))
              : expenses.map(r => (
                  <tr key={r.account.id} className="t-row">
                    <td className="t-cell font-mono text-ink-2">{r.account.code}</td>
                    <td className="t-cell">{r.account.name}</td>
                    <td className="t-cell num">{r.amount.toLocaleString('en-ZA', { minimumFractionDigits: 2 })}</td>
                  </tr>
                ))}
            <tr className="bg-paper-edge border-t-2 border-paper-edge">
              <td />
              <td className="px-3 py-2 font-semibold">Total Expenses</td>
              <td className="px-3 py-2 num font-semibold">{loading ? '—' : totalExpenses.toLocaleString('en-ZA', { minimumFractionDigits: 2 })}</td>
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

      {!loading && (
        <div
          className="mt-2 px-3 py-1.5 text-xs rounded inline-flex items-center gap-2 italic text-ink-2"
          style={{ border: '1px dashed var(--paper-edge)' }}
        >
          P&L check · Revenue {totalRevenue.toLocaleString('en-ZA', { minimumFractionDigits: 2 })} − Expenses {totalExpenses.toLocaleString('en-ZA', { minimumFractionDigits: 2 })} = {netProfit.toLocaleString('en-ZA', { minimumFractionDigits: 2 })}
        </div>
      )}
    </div>
  )
}
