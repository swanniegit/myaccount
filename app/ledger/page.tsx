'use client'
import { useEffect, useState } from 'react'
import { supabase } from '@/lib/supabase'
import { formatMoney } from '@/lib/utils'
import type { Account, JournalLine } from '@/lib/types'

interface AccountRow {
  code: string
  name: string
  open: number
  dr: number
  cr: number
  close: number
  id: string
  type: string
}

interface TLine {
  date: string
  label: string
  dr: number
  cr: number
}

export default function LedgerPage() {
  const [rows, setRows] = useState<AccountRow[]>([])
  const [filtered, setFiltered] = useState<AccountRow[]>([])
  const [search, setSearch] = useState('')
  const [typeFilter, setTypeFilter] = useState('all')
  const [selected, setSelected] = useState<AccountRow | null>(null)
  const [tLines, setTLines] = useState<TLine[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    async function load() {
      const { data: accounts } = await supabase
        .from('acct_accounts')
        .select('*')
        .eq('is_active', true)
        .order('code')

      const { data: lines } = await supabase
        .from('acct_journal_lines')
        .select('account_id, debit, credit')

      if (!accounts || !lines) return

      const result: AccountRow[] = accounts.map(acc => {
        const accLines = lines.filter(l => l.account_id === acc.id)
        const dr = accLines.reduce((s, l) => s + Number(l.debit), 0)
        const cr = accLines.reduce((s, l) => s + Number(l.credit), 0)
        const bal = acc.normal_balance === 'debit' ? dr - cr : cr - dr
        return {
          id: acc.id,
          code: acc.code,
          name: acc.name,
          type: acc.type,
          open: 0,
          dr,
          cr,
          close: bal,
        }
      })

      setRows(result)
      setFiltered(result)
      setLoading(false)
    }
    load()
  }, [])

  useEffect(() => {
    let r = rows
    if (search) {
      const q = search.toLowerCase()
      r = r.filter(x => x.name.toLowerCase().includes(q) || x.code.includes(q))
    }
    if (typeFilter !== 'all') {
      r = r.filter(x => x.type === typeFilter)
    }
    setFiltered(r)
  }, [search, typeFilter, rows])

  async function selectAccount(row: AccountRow) {
    setSelected(row)
    const { data } = await supabase
      .from('acct_journal_lines')
      .select('debit, credit, description, created_at, acct_journal_entries(date, description)')
      .eq('account_id', row.id)
      .order('created_at', { ascending: true })

    if (data) {
      setTLines(
        data.map(l => ({
          date: (l as any).acct_journal_entries?.date ?? '',
          label: (l as any).acct_journal_entries?.description ?? l.description ?? '—',
          dr: Number(l.debit),
          cr: Number(l.credit),
        }))
      )
    }
  }

  const tDr = tLines.reduce((s, l) => s + l.dr, 0)
  const tCr = tLines.reduce((s, l) => s + l.cr, 0)
  const tBal = selected
    ? selected.type === 'asset' || selected.type === 'expense'
      ? tDr - tCr
      : tCr - tDr
    : 0

  const movement = tBal
  const vsLast = 0

  return (
    <div className="flex h-full" style={{ minHeight: 0 }}>
      {/* Left: table */}
      <div className="flex-1 p-5 overflow-auto">
        <h1 className="text-xl font-semibold mb-0.5">T-Account Ledger</h1>
        <p className="text-xs mb-4" style={{ color: 'var(--ink-2)' }}>
          Table default · click any row → T peek panel
        </p>

        {/* Filters */}
        <div className="flex gap-2 mb-3">
          <div
            className="flex items-center gap-2 px-3 py-1.5 rounded"
            style={{ border: '1px solid var(--paper-edge)', background: 'var(--surface)', width: 200 }}
          >
            <span className="text-xs" style={{ color: 'var(--muted)' }}>⌕</span>
            <input
              type="text"
              placeholder="search"
              value={search}
              onChange={e => setSearch(e.target.value)}
              className="flex-1 outline-none bg-transparent text-xs"
            />
          </div>
          <select
            value={typeFilter}
            onChange={e => setTypeFilter(e.target.value)}
            className="text-xs px-2 py-1.5 rounded"
            style={{ border: '1px solid var(--paper-edge)', background: 'var(--surface)', minWidth: 90 }}
          >
            <option value="all">all</option>
            <option value="asset">asset</option>
            <option value="liability">liability</option>
            <option value="equity">equity</option>
            <option value="revenue">revenue</option>
            <option value="expense">expense</option>
          </select>
          <div
            className="text-xs px-2 py-1.5 rounded"
            style={{ border: '1px solid var(--paper-edge)', background: 'var(--surface)', color: 'var(--ink-2)' }}
          >
            Mar 2026
          </div>
          <button
            className="text-xs px-3 py-1.5 rounded ml-auto"
            style={{ background: 'var(--surface)', border: '1px solid var(--paper-edge)', color: 'var(--ink-2)' }}
          >
            Export
          </button>
        </div>

        {/* Table */}
        <div className="rounded-lg overflow-hidden" style={{ border: '1px solid var(--paper-edge)' }}>
          <table className="w-full text-xs">
            <thead>
              <tr style={{ background: 'var(--paper-edge)' }}>
                {['Code', 'Account', 'Open', 'Dr', 'Cr', 'Close'].map(h => (
                  <th
                    key={h}
                    className={`px-3 py-2 font-medium text-left ${['Open','Dr','Cr','Close'].includes(h) ? 'text-right' : ''}`}
                    style={{ color: 'var(--ink-2)' }}
                  >
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {loading
                ? [...Array(8)].map((_, i) => (
                    <tr key={i} style={{ borderBottom: '1px solid var(--paper-edge)' }}>
                      {[...Array(6)].map((_, j) => (
                        <td key={j} className="px-3 py-2">
                          <div className="h-3 rounded animate-pulse" style={{ background: 'var(--paper-edge)', width: j === 1 ? 120 : 60 }} />
                        </td>
                      ))}
                    </tr>
                  ))
                : filtered.map(row => (
                    <tr
                      key={row.id}
                      onClick={() => selectAccount(row)}
                      className="cursor-pointer"
                      style={{
                        borderBottom: '1px solid var(--paper-edge)',
                        background: selected?.id === row.id ? 'var(--accent-soft)' : 'var(--surface)',
                      }}
                    >
                      <td className="px-3 py-2 font-mono" style={{ color: 'var(--ink-2)' }}>{row.code}</td>
                      <td className="px-3 py-2">{row.name}</td>
                      <td className="px-3 py-2 font-mono text-right" style={{ color: 'var(--ink-2)' }}>
                        {row.open !== 0 ? row.open.toLocaleString('en-ZA', { minimumFractionDigits: 0 }) : '–'}
                      </td>
                      <td className="px-3 py-2 font-mono text-right">
                        {row.dr > 0 ? row.dr.toLocaleString('en-ZA', { minimumFractionDigits: 0 }) : '0'}
                      </td>
                      <td className="px-3 py-2 font-mono text-right" style={{ color: 'var(--ink-2)' }}>
                        {row.cr > 0 ? row.cr.toLocaleString('en-ZA', { minimumFractionDigits: 0 }) : '0'}
                      </td>
                      <td
                        className="px-3 py-2 font-mono text-right font-semibold"
                        style={{ color: row.close < 0 ? 'var(--negative)' : 'var(--ink)' }}
                      >
                        {row.close < 0
                          ? `(${Math.abs(row.close).toLocaleString('en-ZA', { minimumFractionDigits: 0 })})`
                          : row.close.toLocaleString('en-ZA', { minimumFractionDigits: 0 })}
                      </td>
                    </tr>
                  ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Right: T peek panel */}
      {selected && (
        <div
          className="w-64 shrink-0 border-l p-4 overflow-auto"
          style={{ borderColor: 'var(--paper-edge)', background: 'var(--surface)' }}
        >
          <div className="flex items-center justify-between mb-3">
            <span className="text-sm font-semibold">{selected.code} · {selected.name}</span>
            <button
              className="text-xs"
              style={{ color: 'var(--accent)' }}
            >
              open full ↗
            </button>
          </div>

          {/* T-Account */}
          <div className="rounded overflow-hidden mb-3" style={{ border: '1.5px solid var(--ink)' }}>
            <div className="flex" style={{ minHeight: 80 }}>
              {/* DR */}
              <div className="flex-1 p-2 border-r" style={{ borderColor: 'var(--ink)' }}>
                <div className="text-2xs font-medium mb-1" style={{ color: 'var(--ink-2)' }}>DR</div>
                {tLines.filter(l => l.dr > 0).map((l, i) => (
                  <div key={i} className="mb-1">
                    <div className="text-2xs" style={{ color: 'var(--muted)', fontSize: 10 }}>
                      {l.date} {l.label.slice(0, 12)}
                    </div>
                    <div className="font-mono text-2xs">{l.dr.toLocaleString('en-ZA', { minimumFractionDigits: 0 })}</div>
                  </div>
                ))}
              </div>
              {/* CR */}
              <div className="flex-1 p-2">
                <div className="text-2xs font-medium mb-1" style={{ color: 'var(--ink-2)' }}>CR</div>
                {tLines.filter(l => l.cr > 0).map((l, i) => (
                  <div key={i} className="mb-1">
                    <div className="text-2xs" style={{ color: 'var(--muted)', fontSize: 10 }}>
                      {l.date} {l.label.slice(0, 12)}
                    </div>
                    <div className="font-mono text-2xs">{l.cr.toLocaleString('en-ZA', { minimumFractionDigits: 0 })}</div>
                  </div>
                ))}
              </div>
            </div>
            {/* Balance */}
            <div
              className="px-2 py-1.5 flex justify-between"
              style={{ borderTop: '1px solid var(--ink)', background: 'var(--paper)' }}
            >
              <span className="text-2xs font-medium">Bal.</span>
              <span className="font-mono text-xs font-bold">
                {formatMoney(Math.abs(tBal))} {tBal >= 0 ? 'Dr' : 'Cr'}
              </span>
            </div>
          </div>

          {/* Stats */}
          <div className="grid grid-cols-2 gap-2 mb-3">
            <div className="rounded p-2" style={{ border: '1px solid var(--paper-edge)' }}>
              <div className="text-2xs" style={{ color: 'var(--ink-2)' }}>Movement</div>
              <div className="font-mono text-xs font-semibold">{formatMoney(movement)}</div>
            </div>
            <div className="rounded p-2" style={{ border: '1px solid var(--paper-edge)', background: 'var(--accent-soft)' }}>
              <div className="text-2xs" style={{ color: 'var(--ink-2)' }}>vs last period</div>
              <div className="font-mono text-xs font-semibold" style={{ color: 'var(--accent)' }}>
                {vsLast >= 0 ? '+' : ''}{formatMoney(vsLast)}
              </div>
            </div>
          </div>

          <p className="text-2xs" style={{ color: 'var(--muted)', border: '1px dashed var(--paper-edge)', padding: 6, borderRadius: 4 }}>
            click any line → source doc · hover for context
          </p>
        </div>
      )}
    </div>
  )
}
