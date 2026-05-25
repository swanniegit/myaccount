'use client'
import { useEffect, useState } from 'react'
import Link from 'next/link'
import { supabase } from '@/lib/supabase'
import type { Account } from '@/lib/types'
import MonthPicker, { currentMonth, monthRange } from '@/components/ui/MonthPicker'
import type { MonthValue } from '@/components/ui/MonthPicker'

interface EquityRow {
  account: Account
  opening: number
  movement: number
  closing: number
}

const REPORT_TABS = [
  { label: 'Trial Balance',    href: '/reports/trial-balance' },
  { label: 'Income Statement', href: '/reports/income-statement' },
  { label: 'Balance Sheet',    href: '/reports/balance-sheet' },
  { label: 'Cash Flow',        href: '/reports/cash-flow' },
  { label: 'VAT Detail',       href: '/vat' },
]

const MONTHS = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec']

export default function EquityPage() {
  const [period, setPeriod]   = useState<MonthValue>(currentMonth())
  const [rows, setRows]       = useState<EquityRow[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError]     = useState<string | null>(null)

  useEffect(() => {
    async function load() {
      setLoading(true)
      setError(null)

      const { data: accounts, error: accErr } = await supabase
        .from('acct_accounts')
        .select('*')
        .eq('is_active', true)
        .eq('type', 'equity')
        .order('code')

      if (accErr || !accounts) { setError('Failed to load accounts'); setLoading(false); return }

      const { start, end } = monthRange(period)

      const { data: lines, error: lineErr } = await supabase
        .from('acct_journal_lines')
        .select('account_id, debit, credit, acct_journal_entries!inner(date, is_posted)')
        .eq('acct_journal_entries.is_posted', true)
        .gte('acct_journal_entries.date', start)
        .lt('acct_journal_entries.date', end)

      if (lineErr || !lines) { setError('Failed to load journal lines'); setLoading(false); return }

      const movementTotals: Record<string, { debit: number; credit: number }> = {}
      for (const l of lines) {
        if (!movementTotals[l.account_id]) movementTotals[l.account_id] = { debit: 0, credit: 0 }
        movementTotals[l.account_id].debit  += Number(l.debit)
        movementTotals[l.account_id].credit += Number(l.credit)
      }

      const result: EquityRow[] = accounts.map(acc => {
        const t = movementTotals[acc.id]
        const movement = t
          ? (acc.normal_balance === 'credit' ? t.credit - t.debit : t.debit - t.credit)
          : 0
        return { account: acc, opening: 0, movement, closing: movement }
      })

      setRows(result)
      setLoading(false)
    }
    load()
  }, [period])

  const totalMovement = rows.reduce((s, r) => s + r.movement, 0)
  const totalClosing  = rows.reduce((s, r) => s + r.closing, 0)

  return (
    <div className="p-5 max-w-3xl">
      <div className="flex items-start justify-between mb-1">
        <div>
          <h1 className="text-xl font-semibold">Reports · Statement of Changes in Equity</h1>
          <p className="text-xs mt-0.5 text-ink-2">{MONTHS[period.month]} {period.year}</p>
        </div>
        <MonthPicker value={period} onChange={setPeriod} />
      </div>

      <div className="flex gap-1 mb-4 flex-wrap">
        {REPORT_TABS.map(tab => (
          <Link key={tab.label} href={tab.href} className="pill no-underline" data-active={false}>
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
              <th className="text-right w-28">Opening</th>
              <th className="text-right w-28">Movements</th>
              <th className="text-right w-28">Closing</th>
            </tr>
          </thead>
          <tbody>
            {loading
              ? [...Array(6)].map((_, i) => (
                  <tr key={i} className="t-row">
                    {[...Array(5)].map((_, j) => (
                      <td key={j} className="t-cell"><div className="h-3 rounded animate-pulse bg-paper-edge" /></td>
                    ))}
                  </tr>
                ))
              : rows.map(r => (
                  <tr key={r.account.id} className="t-row">
                    <td className="t-cell font-mono text-ink-2">{r.account.code}</td>
                    <td className="t-cell">{r.account.name}</td>
                    <td className="t-cell num text-ink-2">{r.opening.toLocaleString('en-ZA', { minimumFractionDigits: 2 })}</td>
                    <td className="t-cell num" style={{ color: r.movement >= 0 ? 'var(--positive)' : 'var(--negative)' }}>
                      {r.movement.toLocaleString('en-ZA', { minimumFractionDigits: 2 })}
                    </td>
                    <td className="t-cell num">{r.closing.toLocaleString('en-ZA', { minimumFractionDigits: 2 })}</td>
                  </tr>
                ))}
          </tbody>
          <tfoot>
            <tr style={{ background: 'var(--accent-soft)', borderTop: '2px solid var(--paper-edge)' }}>
              <td />
              <td className="px-3 py-2 font-semibold">Total Equity</td>
              <td className="px-3 py-2 num font-semibold text-ink-2">
                {loading ? '—' : (0).toLocaleString('en-ZA', { minimumFractionDigits: 2 })}
              </td>
              <td className="px-3 py-2 num font-semibold" style={{ color: totalMovement >= 0 ? 'var(--positive)' : 'var(--negative)' }}>
                {loading ? '—' : totalMovement.toLocaleString('en-ZA', { minimumFractionDigits: 2 })}
              </td>
              <td className="px-3 py-2 num font-semibold">
                {loading ? '—' : totalClosing.toLocaleString('en-ZA', { minimumFractionDigits: 2 })}
              </td>
            </tr>
          </tfoot>
        </table>
      </div>

      <p className="mt-3 text-xs italic text-ink-2">
        Retained earnings are computed from the income statement and not shown separately in this view.
      </p>
    </div>
  )
}
