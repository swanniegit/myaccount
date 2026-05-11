'use client'
import { useEffect, useState } from 'react'
import Link from 'next/link'
import { supabase } from '@/lib/supabase'
import type { Account } from '@/lib/types'

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

export default function BalanceSheetPage() {
  const [assets, setAssets]       = useState<AccRow[]>([])
  const [liabilities, setLiabilities] = useState<AccRow[]>([])
  const [equity, setEquity]       = useState<AccRow[]>([])
  const [retainedEarnings, setRetainedEarnings] = useState(0)
  const [loading, setLoading]     = useState(true)
  const [error, setError]         = useState<string | null>(null)

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
      const BATCH = 1000
      let offset = 0

      while (true) {
        const { data: batch, error: lineErr } = await supabase
          .from('acct_journal_lines')
          .select('account_id, debit, credit')
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

      const a: AccRow[] = []
      const li: AccRow[] = []
      const eq: AccRow[] = []
      let totalRev = 0
      let totalExp = 0

      for (const acc of accounts) {
        const t = totals[acc.id]
        if (!t) continue
        if (acc.type === 'asset') {
          const amount = acc.normal_balance === 'debit' ? t.debit - t.credit : t.credit - t.debit
          if (amount !== 0) a.push({ account: acc, amount })
        } else if (acc.type === 'liability') {
          const amount = acc.normal_balance === 'credit' ? t.credit - t.debit : t.debit - t.credit
          if (amount !== 0) li.push({ account: acc, amount })
        } else if (acc.type === 'equity') {
          const amount = acc.normal_balance === 'credit' ? t.credit - t.debit : t.debit - t.credit
          if (amount !== 0) eq.push({ account: acc, amount })
        } else if (acc.type === 'revenue') {
          const amount = acc.normal_balance === 'credit' ? t.credit - t.debit : t.debit - t.credit
          totalRev += amount
        } else if (acc.type === 'expense') {
          const amount = acc.normal_balance === 'debit' ? t.debit - t.credit : t.credit - t.debit
          totalExp += amount
        }
      }

      setAssets(a)
      setLiabilities(li)
      setEquity(eq)
      setRetainedEarnings(totalRev - totalExp)
      setLoading(false)
    }
    load()
  }, [])

  const totalAssets      = assets.reduce((s, r) => s + r.amount, 0)
  const totalLiabilities = liabilities.reduce((s, r) => s + r.amount, 0)
  const totalEquity      = equity.reduce((s, r) => s + r.amount, 0)
  const totalEquityRetained = totalEquity + retainedEarnings
  const totalLiabEquity  = totalLiabilities + totalEquityRetained
  const isBalanced       = Math.abs(totalAssets - totalLiabEquity) < 0.01

  const today = new Date().toLocaleDateString('en-ZA', { day: 'numeric', month: 'long', year: 'numeric' })

  return (
    <div className="p-5 max-w-3xl">
      <div className="flex items-start justify-between mb-1">
        <div>
          <h1 className="text-xl font-semibold">Reports · Balance Sheet</h1>
          <p className="text-xs mt-0.5" style={{ color: 'var(--ink-2)' }}>As at {today}</p>
        </div>
      </div>

      <div className="flex gap-1 mb-4 flex-wrap">
        {REPORT_TABS.map(tab => (
          <Link
            key={tab.label}
            href={tab.href}
            className="px-3 py-1 text-xs rounded font-medium"
            style={{
              background: tab.href === '/reports/balance-sheet' ? 'var(--ink)' : 'var(--surface)',
              color: tab.href === '/reports/balance-sheet' ? '#fff' : 'var(--ink-2)',
              border: `1px solid ${tab.href === '/reports/balance-sheet' ? 'var(--ink)' : 'var(--paper-edge)'}`,
              textDecoration: 'none',
            }}
          >
            {tab.label}
          </Link>
        ))}
      </div>

      {error && (
        <div className="text-xs px-3 py-2 rounded mb-4" style={{ background: 'var(--accent-soft)', color: 'var(--negative)', border: '1px solid var(--negative)' }}>
          {error}
        </div>
      )}

      <div className="rounded-lg overflow-hidden" style={{ border: '1px solid var(--paper-edge)' }}>
        <table className="w-full text-xs">
          <thead>
            <tr style={{ background: 'var(--paper-edge)' }}>
              <th className="px-3 py-2 text-left font-medium w-16" style={{ color: 'var(--ink-2)' }}>Code</th>
              <th className="px-3 py-2 text-left font-medium" style={{ color: 'var(--ink-2)' }}>Account</th>
              <th className="px-3 py-2 text-right font-medium w-32" style={{ color: 'var(--ink-2)' }}>Amount</th>
            </tr>
          </thead>
          <tbody>
            <tr style={{ background: 'var(--accent-soft)' }}>
              <td colSpan={3} className="px-3 py-1.5 font-semibold text-xs" style={{ color: 'var(--ink)' }}>Assets</td>
            </tr>
            {loading
              ? [...Array(6)].map((_, i) => (
                  <tr key={i} style={{ borderBottom: '1px solid var(--paper-edge)' }}>
                    {[...Array(3)].map((_, j) => (
                      <td key={j} className="px-3 py-2">
                        <div className="h-3 rounded animate-pulse" style={{ background: 'var(--paper-edge)' }} />
                      </td>
                    ))}
                  </tr>
                ))
              : assets.map(r => (
                  <tr key={r.account.id} style={{ borderBottom: '1px solid var(--paper-edge)', background: 'var(--surface)' }}>
                    <td className="px-3 py-2 font-mono" style={{ color: 'var(--ink-2)' }}>{r.account.code}</td>
                    <td className="px-3 py-2">{r.account.name}</td>
                    <td className="px-3 py-2 font-mono text-right">{r.amount.toLocaleString('en-ZA', { minimumFractionDigits: 2 })}</td>
                  </tr>
                ))}
            <tr style={{ background: 'var(--paper-edge)', borderTop: '2px solid var(--paper-edge)' }}>
              <td />
              <td className="px-3 py-2 font-semibold">Total Assets</td>
              <td className="px-3 py-2 font-mono font-semibold text-right">
                {loading ? '—' : totalAssets.toLocaleString('en-ZA', { minimumFractionDigits: 2 })}
              </td>
            </tr>

            <tr style={{ background: 'var(--accent-soft)' }}>
              <td colSpan={3} className="px-3 py-1.5 font-semibold text-xs" style={{ color: 'var(--ink)' }}>Liabilities</td>
            </tr>
            {loading
              ? [...Array(4)].map((_, i) => (
                  <tr key={i} style={{ borderBottom: '1px solid var(--paper-edge)' }}>
                    {[...Array(3)].map((_, j) => (
                      <td key={j} className="px-3 py-2">
                        <div className="h-3 rounded animate-pulse" style={{ background: 'var(--paper-edge)' }} />
                      </td>
                    ))}
                  </tr>
                ))
              : liabilities.map(r => (
                  <tr key={r.account.id} style={{ borderBottom: '1px solid var(--paper-edge)', background: 'var(--surface)' }}>
                    <td className="px-3 py-2 font-mono" style={{ color: 'var(--ink-2)' }}>{r.account.code}</td>
                    <td className="px-3 py-2">{r.account.name}</td>
                    <td className="px-3 py-2 font-mono text-right">{r.amount.toLocaleString('en-ZA', { minimumFractionDigits: 2 })}</td>
                  </tr>
                ))}
            <tr style={{ background: 'var(--paper-edge)', borderTop: '2px solid var(--paper-edge)' }}>
              <td />
              <td className="px-3 py-2 font-semibold">Total Liabilities</td>
              <td className="px-3 py-2 font-mono font-semibold text-right">
                {loading ? '—' : totalLiabilities.toLocaleString('en-ZA', { minimumFractionDigits: 2 })}
              </td>
            </tr>

            <tr style={{ background: 'var(--accent-soft)' }}>
              <td colSpan={3} className="px-3 py-1.5 font-semibold text-xs" style={{ color: 'var(--ink)' }}>Equity</td>
            </tr>
            {loading
              ? [...Array(3)].map((_, i) => (
                  <tr key={i} style={{ borderBottom: '1px solid var(--paper-edge)' }}>
                    {[...Array(3)].map((_, j) => (
                      <td key={j} className="px-3 py-2">
                        <div className="h-3 rounded animate-pulse" style={{ background: 'var(--paper-edge)' }} />
                      </td>
                    ))}
                  </tr>
                ))
              : equity.map(r => (
                  <tr key={r.account.id} style={{ borderBottom: '1px solid var(--paper-edge)', background: 'var(--surface)' }}>
                    <td className="px-3 py-2 font-mono" style={{ color: 'var(--ink-2)' }}>{r.account.code}</td>
                    <td className="px-3 py-2">{r.account.name}</td>
                    <td className="px-3 py-2 font-mono text-right">{r.amount.toLocaleString('en-ZA', { minimumFractionDigits: 2 })}</td>
                  </tr>
                ))}
            {!loading && (
              <tr style={{ borderBottom: '1px solid var(--paper-edge)', background: 'var(--surface)' }}>
                <td className="px-3 py-2 font-mono" style={{ color: 'var(--ink-2)' }}>—</td>
                <td className="px-3 py-2" style={{ fontStyle: 'italic' }}>Retained earnings</td>
                <td className="px-3 py-2 font-mono text-right" style={{ color: retainedEarnings >= 0 ? 'var(--positive)' : 'var(--negative)' }}>
                  {retainedEarnings.toLocaleString('en-ZA', { minimumFractionDigits: 2 })}
                </td>
              </tr>
            )}
            <tr style={{ background: 'var(--paper-edge)', borderTop: '2px solid var(--paper-edge)' }}>
              <td />
              <td className="px-3 py-2 font-semibold">Total Equity</td>
              <td className="px-3 py-2 font-mono font-semibold text-right">
                {loading ? '—' : totalEquityRetained.toLocaleString('en-ZA', { minimumFractionDigits: 2 })}
              </td>
            </tr>
          </tbody>
          <tfoot>
            <tr style={{ background: 'var(--surface)', borderTop: '2px solid var(--paper-edge)' }}>
              <td />
              <td className="px-3 py-2.5 font-bold">Total Liabilities &amp; Equity</td>
              <td className="px-3 py-2.5 font-mono font-bold text-right">
                {loading ? '—' : totalLiabEquity.toLocaleString('en-ZA', { minimumFractionDigits: 2 })}
              </td>
            </tr>
          </tfoot>
        </table>
      </div>

      {!loading && (
        <div
          className="mt-2 px-3 py-1.5 text-xs rounded inline-flex items-center gap-2"
          style={{
            border: `1px dashed ${isBalanced ? 'var(--positive)' : 'var(--negative)'}`,
            color: isBalanced ? 'var(--positive)' : 'var(--negative)',
            fontStyle: 'italic',
          }}
        >
          {isBalanced
            ? '✓ Balanced'
            : `✗ Out by R ${Math.abs(totalAssets - totalLiabEquity).toLocaleString('en-ZA', { minimumFractionDigits: 2 })}`}
        </div>
      )}
    </div>
  )
}
