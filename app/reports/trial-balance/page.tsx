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
  { label: 'Trial Balance', href: '/reports/trial-balance' },
  { label: 'Income Statement', href: '/reports/income-statement' },
  { label: 'Balance Sheet', href: '/reports/balance-sheet' },
  { label: 'Cash Flow', href: '/reports/cash-flow' },
  { label: 'VAT Detail', href: '/vat' },
  { label: 'SARS pack', href: '/reports' },
]

export default function TrialBalancePage() {
  const [rows, setRows] = useState<TBRow[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    async function load() {
      const { data: accounts } = await supabase.from('acct_accounts').select('*').eq('is_active', true).order('code')
      const { data: lines } = await supabase.from('acct_journal_lines').select('account_id, debit, credit')

      if (!accounts || !lines) return

      const result: TBRow[] = []

      for (const acc of accounts) {
        const accLines = lines.filter(l => l.account_id === acc.id)
        const dr = accLines.reduce((s, l) => s + Number(l.debit), 0)
        const cr = accLines.reduce((s, l) => s + Number(l.credit), 0)

        if (dr === 0 && cr === 0) continue

        const bal = acc.normal_balance === 'debit' ? dr - cr : cr - dr
        const tbDebit = acc.normal_balance === 'debit' && bal > 0 ? bal : (acc.normal_balance === 'credit' && bal < 0 ? Math.abs(bal) : 0)
        const tbCredit = acc.normal_balance === 'credit' && bal > 0 ? bal : (acc.normal_balance === 'debit' && bal < 0 ? Math.abs(bal) : 0)

        result.push({ account: acc, debit: tbDebit, credit: tbCredit })
      }

      setRows(result)
      setLoading(false)
    }
    load()
  }, [])

  const totalDebit  = rows.reduce((s, r) => s + r.debit, 0)
  const totalCredit = rows.reduce((s, r) => s + r.credit, 0)
  const isBalanced  = Math.abs(totalDebit - totalCredit) < 0.01

  return (
    <div className="p-5 max-w-4xl">
      <div className="flex items-start justify-between mb-1">
        <div>
          <h1 className="text-xl font-semibold">Reports · Trial Balance</h1>
          <p className="text-xs mt-0.5 text-ink-2">
            {new Date().toLocaleDateString('en-ZA', { day: 'numeric', month: 'long', year: 'numeric' })} · IFRS for SMEs
          </p>
        </div>
        <div className="flex gap-2">
          <button className="btn btn-secondary text-xs">Compare vs Feb</button>
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

      <div className="grid grid-cols-5 gap-2 mb-4">
        {[
          { type: 'asset', label: 'Assets' },
          { type: 'liability', label: 'Liab.' },
          { type: 'equity', label: 'Equity' },
          { type: 'revenue', label: 'Income' },
          { type: 'expense', label: 'Expense' },
        ].map(({ type, label }) => {
          const sum = rows.filter(r => r.account.type === type).reduce((s, r) => s + r.debit + r.credit, 0)
          return (
            <div key={type} className="card p-3">
              <div className="text-xs mb-1 text-ink-2">{label}</div>
              <div className="num text-sm font-bold">
                {loading ? '—' : `R ${sum.toLocaleString('en-ZA', { minimumFractionDigits: 0 })}`}
              </div>
              <div className="text-xs mt-0.5 text-accent" style={{ fontSize: 10 }}>+8%</div>
            </div>
          )
        })}
      </div>

      <div className="card overflow-hidden">
        <table className="w-full text-xs">
          <thead className="t-head">
            <tr>
              <th className="text-left w-16">Code</th>
              <th className="text-left">Account</th>
              <th className="text-right w-28">Debit</th>
              <th className="text-right w-28">Credit</th>
              <th className="text-right w-16">vs Feb</th>
            </tr>
          </thead>
          <tbody>
            {loading
              ? [...Array(8)].map((_, i) => (
                  <tr key={i} className="t-row">
                    {[...Array(5)].map((_, j) => (
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
                    <td className="t-cell text-right text-accent">▲</td>
                  </tr>
                ))}
          </tbody>
          <tfoot>
            <tr style={{ background: 'var(--accent-soft)', borderTop: '2px solid var(--paper-edge)' }}>
              <td />
              <td className="px-3 py-2 font-semibold">Totals</td>
              <td className="px-3 py-2 num font-semibold">{totalDebit.toLocaleString('en-ZA', { minimumFractionDigits: 2 })}</td>
              <td className="px-3 py-2 num font-semibold">{totalCredit.toLocaleString('en-ZA', { minimumFractionDigits: 2 })}</td>
              <td />
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
