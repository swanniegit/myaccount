'use client'
import { useEffect, useState } from 'react'
import Link from 'next/link'
import { supabase } from '@/lib/supabase'
import type { Account } from '@/lib/types'

interface TBRow {
  account: Account
  debit: number
  credit: number
}

const REPORT_TABS = [
  { label: 'Trial Balance',    href: '/reports/trial-balance' },
  { label: 'Income Statement', href: '/reports/income-statement' },
  { label: 'Balance Sheet',    href: '/reports/balance-sheet' },
  { label: 'Cash Flow',        href: '/reports/cash-flow' },
  { label: 'VAT Detail',       href: '/vat' },
  { label: 'SARS pack',        href: '/reports' },
]

function isoToday() {
  return new Date().toISOString().slice(0, 10)
}

function isoFirstOfYear() {
  return `${new Date().getFullYear()}-01-01`
}

const BATCH = 1000

export default function TrialBalancePage() {
  const [rows, setRows]       = useState<TBRow[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError]     = useState<string | null>(null)
  const [dateFrom, setDateFrom] = useState(isoFirstOfYear())
  const [dateTo, setDateTo]     = useState(isoToday())

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

      const totals: Record<string, { debit: number; credit: number }> = {}
      let offset = 0

      while (true) {
        const { data: batch, error: lineErr } = await supabase
          .from('acct_journal_lines')
          .select('account_id, debit, credit, acct_journal_entries!inner(date, is_posted)')
          .eq('acct_journal_entries.is_posted', true)
          .gte('acct_journal_entries.date', dateFrom)
          .lte('acct_journal_entries.date', dateTo)
          .range(offset, offset + BATCH - 1)

        if (lineErr) { setError('Failed to load journal lines'); setLoading(false); return }
        if (!batch || batch.length === 0) break

        for (const l of batch) {
          if (!totals[l.account_id]) totals[l.account_id] = { debit: 0, credit: 0 }
          totals[l.account_id].debit  += Number(l.debit)
          totals[l.account_id].credit += Number(l.credit)
        }

        if (batch.length < BATCH) break
        offset += BATCH
      }

      const result: TBRow[] = []

      for (const acc of accounts) {
        const t = totals[acc.id]
        if (!t) continue
        const bal = acc.normal_balance === 'debit' ? t.debit - t.credit : t.credit - t.debit
        const tbDebit  = acc.normal_balance === 'debit'  && bal > 0 ? bal : (acc.normal_balance === 'credit' && bal < 0 ? Math.abs(bal) : 0)
        const tbCredit = acc.normal_balance === 'credit' && bal > 0 ? bal : (acc.normal_balance === 'debit'  && bal < 0 ? Math.abs(bal) : 0)
        result.push({ account: acc, debit: tbDebit, credit: tbCredit })
      }

      setRows(result)
      setLoading(false)
    }
    load()
  }, [dateFrom, dateTo])

  const totalDebit  = rows.reduce((s, r) => s + r.debit, 0)
  const totalCredit = rows.reduce((s, r) => s + r.credit, 0)
  const isBalanced  = Math.abs(totalDebit - totalCredit) < 0.01

  return (
    <div className="p-5 max-w-4xl">
      <div className="flex items-start justify-between mb-1">
        <div>
          <h1 className="text-xl font-semibold">Reports · Trial Balance</h1>
          <p className="text-xs mt-0.5 text-ink-2">Posted entries only · IFRS for SMEs</p>
        </div>
        <div className="flex gap-2 items-center">
          <label className="text-xs text-ink-2">From</label>
          <input
            type="date"
            value={dateFrom}
            onChange={e => setDateFrom(e.target.value)}
            className="input text-xs py-1 px-2"
          />
          <label className="text-xs text-ink-2">To</label>
          <input
            type="date"
            value={dateTo}
            onChange={e => setDateTo(e.target.value)}
            className="input text-xs py-1 px-2"
          />
          <button className="btn btn-ghost text-xs">Export PDF</button>
        </div>
      </div>

      <div className="flex gap-1 mb-4 flex-wrap">
        {REPORT_TABS.map(tab => (
          <Link key={tab.label} href={tab.href} className="pill no-underline" data-active={tab.href === '/reports/trial-balance'}>
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
              <th className="text-right w-28">Debit</th>
              <th className="text-right w-28">Credit</th>
            </tr>
          </thead>
          <tbody>
            {loading
              ? [...Array(8)].map((_, i) => (
                  <tr key={i} className="t-row">
                    {[...Array(4)].map((_, j) => (
                      <td key={j} className="t-cell">
                        <div className="h-3 rounded animate-pulse bg-paper-edge" />
                      </td>
                    ))}
                  </tr>
                ))
              : rows.map(row => (
                  <tr key={row.account.id} className="t-row cursor-pointer hover:opacity-80">
                    <td className="t-cell font-mono text-ink-2">{row.account.code}</td>
                    <td className="t-cell">{row.account.name}</td>
                    <td className="t-cell num">{row.debit > 0 ? row.debit.toLocaleString('en-ZA', { minimumFractionDigits: 2 }) : '—'}</td>
                    <td className="t-cell num text-ink-2">{row.credit > 0 ? row.credit.toLocaleString('en-ZA', { minimumFractionDigits: 2 }) : '—'}</td>
                  </tr>
                ))}
          </tbody>
          <tfoot>
            <tr style={{ background: 'var(--accent-soft)', borderTop: '2px solid var(--paper-edge)' }}>
              <td />
              <td className="px-3 py-2 font-semibold">Totals</td>
              <td className="px-3 py-2 num font-semibold">{totalDebit.toLocaleString('en-ZA', { minimumFractionDigits: 2 })}</td>
              <td className="px-3 py-2 num font-semibold">{totalCredit.toLocaleString('en-ZA', { minimumFractionDigits: 2 })}</td>
            </tr>
          </tfoot>
        </table>
      </div>

      <div
        className="mt-2 px-3 py-1.5 text-xs rounded inline-flex items-center gap-2 italic"
        style={{
          border: `1px dashed ${isBalanced ? 'var(--positive)' : 'var(--negative)'}`,
          color: isBalanced ? 'var(--positive)' : 'var(--negative)',
        }}
      >
        {isBalanced ? '✓ Balanced' : '✗ Unbalanced'} · click any row to see the T-account behind it
      </div>
    </div>
  )
}
