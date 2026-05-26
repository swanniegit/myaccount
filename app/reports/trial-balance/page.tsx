'use client'
import { useEffect, useState } from 'react'
import Link from 'next/link'
import { supabase } from '@/lib/supabase'
import type { Account } from '@/lib/types'

interface TBRow {
  account: Account
  debit: number
  credit: number
  priorDebit: number
  priorCredit: number
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

function priorYear(dateStr: string): string {
  return dateStr.replace(/^(\d{4})/, (_, y) => String(parseInt(y) - 1))
}

const BATCH = 1000

type Totals = Record<string, { debit: number; credit: number }>
type TBSide = { debit: number; credit: number }

function toTBColumns(raw: TBSide | undefined, normalBalance: 'debit' | 'credit'): TBSide {
  if (!raw) return { debit: 0, credit: 0 }
  const bal = normalBalance === 'debit' ? raw.debit - raw.credit : raw.credit - raw.debit
  return {
    debit:  normalBalance === 'debit'  && bal > 0 ? bal : (normalBalance === 'credit' && bal < 0 ? Math.abs(bal) : 0),
    credit: normalBalance === 'credit' && bal > 0 ? bal : (normalBalance === 'debit'  && bal < 0 ? Math.abs(bal) : 0),
  }
}

async function fetchTotals(upTo: string): Promise<Totals> {
  const totals: Totals = {}
  let offset = 0
  while (true) {
    const { data: batch, error } = await supabase
      .from('acct_journal_lines')
      .select('account_id, debit, credit, acct_journal_entries!inner(date, is_posted)')
      .eq('acct_journal_entries.is_posted', true)
      .lte('acct_journal_entries.date', upTo)
      .range(offset, offset + BATCH - 1)
    if (error || !batch?.length) break
    for (const l of batch) {
      if (!totals[l.account_id]) totals[l.account_id] = { debit: 0, credit: 0 }
      totals[l.account_id].debit  += Number(l.debit)
      totals[l.account_id].credit += Number(l.credit)
    }
    if (batch.length < BATCH) break
    offset += BATCH
  }
  return totals
}

export default function TrialBalancePage() {
  const [rows, setRows]       = useState<TBRow[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError]     = useState<string | null>(null)
  const [asAt, setAsAt]       = useState(isoToday())

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

      const [totals, priorTotals] = await Promise.all([
        fetchTotals(asAt),
        fetchTotals(priorYear(asAt)),
      ])

      const result: TBRow[] = []

      for (const acc of accounts) {
        const t  = totals[acc.id]
        const pt = priorTotals[acc.id]
        if (!t && !pt) continue

        const cur  = toTBColumns(t,  acc.normal_balance)
        const prev = toTBColumns(pt, acc.normal_balance)
        result.push({ account: acc, debit: cur.debit, credit: cur.credit, priorDebit: prev.debit, priorCredit: prev.credit })
      }

      setRows(result)
      setLoading(false)
    }
    load()
  }, [asAt])

  const totalDebit  = rows.reduce((s, r) => s + r.debit, 0)
  const totalCredit = rows.reduce((s, r) => s + r.credit, 0)
  const isBalanced  = Math.abs(totalDebit - totalCredit) < 0.01
  const pyLabel     = priorYear(asAt)

  const fmt = (n: number) => n > 0 ? n.toLocaleString('en-ZA', { minimumFractionDigits: 2 }) : '—'

  return (
    <div className="p-5 max-w-5xl">
      <div className="flex items-start justify-between mb-1">
        <div>
          <h1 className="text-xl font-semibold">Reports · Trial Balance</h1>
          <p className="text-xs mt-0.5 text-ink-2">Cumulative as at {asAt} · posted entries only</p>
        </div>
        <div className="flex gap-2 items-center">
          <label className="text-xs text-ink-2">As at</label>
          <input
            type="date"
            value={asAt}
            onChange={e => setAsAt(e.target.value)}
            className="input text-xs py-1 px-2"
          />
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
              <th className="text-right w-24 text-ink-2">Prior Dr</th>
              <th className="text-right w-24 text-ink-2">Prior Cr</th>
            </tr>
            <tr>
              <th colSpan={2} />
              <th className="text-right text-ink-2 font-normal pb-1" style={{ fontSize: 10 }}>{asAt}</th>
              <th className="text-right text-ink-2 font-normal pb-1" style={{ fontSize: 10 }}>{asAt}</th>
              <th className="text-right text-ink-2 font-normal pb-1" style={{ fontSize: 10 }}>{pyLabel}</th>
              <th className="text-right text-ink-2 font-normal pb-1" style={{ fontSize: 10 }}>{pyLabel}</th>
            </tr>
          </thead>
          <tbody>
            {loading
              ? [...Array(8)].map((_, i) => (
                  <tr key={i} className="t-row">
                    {[...Array(6)].map((_, j) => (
                      <td key={j} className="t-cell">
                        <div className="h-3 rounded animate-pulse bg-paper-edge" />
                      </td>
                    ))}
                  </tr>
                ))
              : rows.map(row => (
                  <tr key={row.account.id} className="t-row">
                    <td className="t-cell font-mono text-ink-2">{row.account.code}</td>
                    <td className="t-cell">{row.account.name}</td>
                    <td className="t-cell num">{fmt(row.debit)}</td>
                    <td className="t-cell num text-ink-2">{fmt(row.credit)}</td>
                    <td className="t-cell num text-ink-2" style={{ opacity: 0.6 }}>{fmt(row.priorDebit)}</td>
                    <td className="t-cell num text-ink-2" style={{ opacity: 0.6 }}>{fmt(row.priorCredit)}</td>
                  </tr>
                ))}
          </tbody>
          <tfoot>
            <tr style={{ background: 'var(--accent-soft)', borderTop: '2px solid var(--paper-edge)' }}>
              <td />
              <td className="px-3 py-2 font-semibold">Totals</td>
              <td className="px-3 py-2 num font-semibold">{totalDebit.toLocaleString('en-ZA', { minimumFractionDigits: 2 })}</td>
              <td className="px-3 py-2 num font-semibold">{totalCredit.toLocaleString('en-ZA', { minimumFractionDigits: 2 })}</td>
              <td colSpan={2} />
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
