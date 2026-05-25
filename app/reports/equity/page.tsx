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

      // Opening balance: all posted lines before period start
      const openingTotals: Record<string, { debit: number; credit: number }> = {}
      const { data: openingLines, error: openErr } = await supabase
        .from('acct_journal_lines')
        .select('account_id, debit, credit, acct_journal_entries!inner(date, is_posted)')
        .eq('acct_journal_entries.is_posted', true)
        .lt('acct_journal_entries.date', start)

      if (openErr) { setError('Failed to load opening balances'); setLoading(false); return }

      for (const l of openingLines ?? []) {
        if (!openingTotals[l.account_id]) openingTotals[l.account_id] = { debit: 0, credit: 0 }
        openingTotals[l.account_id].debit  += Number(l.debit)
        openingTotals[l.account_id].credit += Number(l.credit)
      }

      // Period movement: posted lines within the period
      const movementTotals: Record<string, { debit: number; credit: number }> = {}
      const { data: periodLines, error: perErr } = await supabase
        .from('acct_journal_lines')
        .select('account_id, debit, credit, acct_journal_entries!inner(date, is_posted)')
        .eq('acct_journal_entries.is_posted', true)
        .gte('acct_journal_entries.date', start)
        .lt('acct_journal_entries.date', end)

      if (perErr) { setError('Failed to load period movements'); setLoading(false); return }

      for (const l of periodLines ?? []) {
        if (!movementTotals[l.account_id]) movementTotals[l.account_id] = { debit: 0, credit: 0 }
        movementTotals[l.account_id].debit  += Number(l.debit)
        movementTotals[l.account_id].credit += Number(l.credit)
      }

      const result: EquityRow[] = accounts.map(acc => {
        const ot = openingTotals[acc.id]
        const mt = movementTotals[acc.id]
        const opening  = ot ? (acc.normal_balance === 'credit' ? ot.credit - ot.debit : ot.debit - ot.credit) : 0
        const movement = mt ? (acc.normal_balance === 'credit' ? mt.credit - mt.debit : mt.debit - mt.credit) : 0
        return { account: acc, opening, movement, closing: opening + movement }
      })

      setRows(result)
      setLoading(false)
    }
    load()
  }, [period])

  const totalOpening  = rows.reduce((s, r) => s + r.opening, 0)
  const totalMovement = rows.reduce((s, r) => s + r.movement, 0)
  const totalClosing  = rows.reduce((s, r) => s + r.closing, 0)

  return (
    <div className="p-5 max-w-3xl">
      <div className="flex items-start justify-between mb-1">
        <div>
          <h1 className="text-xl font-semibold">Reports · Statement of Changes in Equity</h1>
          <p className="text-xs mt-0.5 text-ink-2">{MONTHS[period.month]} {period.year} · posted only</p>
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
                {loading ? '—' : totalOpening.toLocaleString('en-ZA', { minimumFractionDigits: 2 })}
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
    </div>
  )
}
