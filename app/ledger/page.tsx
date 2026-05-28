'use client'
import { Suspense, useCallback, useEffect, useState } from 'react'
import Link from 'next/link'
import { useSearchParams } from 'next/navigation'
import { supabase } from '@/lib/supabase'
import { formatMoney } from '@/lib/utils'
import MonthPicker, { currentMonth, monthRange, type MonthValue } from '@/components/ui/MonthPicker'
import AccountTransactionsView from '@/components/ledger/AccountTransactionsView'

interface AccountRow { code: string; name: string; open: number; dr: number; cr: number; close: number; id: string; type: string }
interface TLine { date: string; label: string; dr: number; cr: number }

function LedgerRouter() {
  const view = useSearchParams().get('view')
  if (view === 'transactions') {
    return <div className="flex h-full" style={{ minHeight: 0 }}><AccountTransactionsView /></div>
  }
  return <LedgerEnquiry />
}

export default function LedgerPage() {
  return (
    <Suspense fallback={<div className="p-5 text-sm text-ink-2">Loading…</div>}>
      <LedgerRouter />
    </Suspense>
  )
}

function LedgerEnquiry() {
  const [rows, setRows]           = useState<AccountRow[]>([])
  const [filtered, setFiltered]   = useState<AccountRow[]>([])
  const [search, setSearch]       = useState('')
  const [typeFilter, setTypeFilter] = useState('all')
  const [selected, setSelected]   = useState<AccountRow | null>(null)
  const [tLines, setTLines]       = useState<TLine[]>([])
  const [loading, setLoading]     = useState(true)
  const [period, setPeriod]       = useState<MonthValue>(currentMonth())
  const [entryIds, setEntryIds]   = useState<string[]>([])
  const [postedOnly, setPostedOnly] = useState(true)

  useEffect(() => {
    let r = rows
    if (search) { const q = search.toLowerCase(); r = r.filter(x => x.name.toLowerCase().includes(q) || x.code.includes(q)) }
    if (typeFilter !== 'all') r = r.filter(x => x.type === typeFilter)
    setFiltered(r)
  }, [search, typeFilter, rows])

  const load = useCallback(async () => {
    setLoading(true)
    const { start, end } = monthRange(period)

    // Fetch accounts + current-period entries in parallel
    let entriesQuery = supabase.from('acct_journal_entries').select('id').gte('date', start).lt('date', end)
    if (postedOnly) entriesQuery = entriesQuery.eq('is_posted', true)
    const [{ data: accounts }, { data: entries }, { data: priorEntries }] = await Promise.all([
      supabase.from('acct_accounts').select('*').eq('is_active', true).order('code'),
      entriesQuery,
      // Prior posted entries — always posted (opening balance is always from posted data)
      supabase.from('acct_journal_entries').select('id').eq('is_posted', true).lt('date', start),
    ])
    if (!accounts) { setLoading(false); return }

    const ids      = entries?.map(e => e.id) ?? []
    const priorIds = priorEntries?.map(e => e.id) ?? []
    setEntryIds(ids)

    // Batch .in() at 500 to stay within Supabase limits
    async function fetchLines(entryIds: string[]) {
      const out: { account_id: string; debit: number; credit: number }[] = []
      for (let i = 0; i < entryIds.length; i += 500) {
        const { data } = await supabase
          .from('acct_journal_lines').select('account_id, debit, credit')
          .in('entry_id', entryIds.slice(i, i + 500))
        if (data) out.push(...data)
      }
      return out
    }

    const [linesData, priorLinesData] = await Promise.all([
      ids.length      > 0 ? fetchLines(ids)      : Promise.resolve([]),
      priorIds.length > 0 ? fetchLines(priorIds)  : Promise.resolve([]),
    ])

    const BS_TYPES = new Set(['asset', 'liability', 'equity'])

    const result: AccountRow[] = accounts.map(acc => {
      const al     = linesData.filter(l => l.account_id === acc.id)
      const dr     = al.reduce((s,l) => s + Number(l.debit),  0)
      const cr     = al.reduce((s,l) => s + Number(l.credit), 0)
      const movement = acc.normal_balance === 'debit' ? dr - cr : cr - dr

      let open = 0
      if (BS_TYPES.has(acc.type)) {
        const pl   = priorLinesData.filter(l => l.account_id === acc.id)
        const pDr  = pl.reduce((s,l) => s + Number(l.debit),  0)
        const pCr  = pl.reduce((s,l) => s + Number(l.credit), 0)
        open = acc.normal_balance === 'debit' ? pDr - pCr : pCr - pDr
      }

      return { id: acc.id, code: acc.code, name: acc.name, type: acc.type, open, dr, cr, close: open + movement }
    })
    setRows(result); setFiltered(result); setLoading(false)
  }, [period, postedOnly])

  useEffect(() => { setSelected(null); setTLines([]); load() }, [load])

  async function selectAccount(row: AccountRow) {
    setSelected(row)
    if (entryIds.length === 0) { setTLines([]); return }
    const { data } = await supabase
      .from('acct_journal_lines')
      .select('debit, credit, description, created_at, acct_journal_entries(date, description)')
      .eq('account_id', row.id).in('entry_id', entryIds).order('created_at', { ascending: true })
    if (data) {
      setTLines(data.map(l => ({
        date:  (l as any).acct_journal_entries?.date ?? '',
        label: (l as any).acct_journal_entries?.description ?? l.description ?? '—',
        dr: Number(l.debit), cr: Number(l.credit),
      })))
    }
  }

  const tDr  = tLines.reduce((s,l) => s + l.dr, 0)
  const tCr  = tLines.reduce((s,l) => s + l.cr, 0)
  const tBal = selected ? (selected.type === 'asset' || selected.type === 'expense' ? tDr - tCr : tCr - tDr) : 0

  return (
    <div className="flex h-full" style={{ minHeight: 0 }}>
      <div className="flex-1 p-5 overflow-auto">
        <h1 className="text-xl font-semibold mb-0.5">T-Account Ledger</h1>
        <p className="text-xs mb-4 text-ink-2">Table default · click any row → T peek panel</p>

        <div className="flex gap-2 mb-3">
          <div className="search-box" style={{ width: 200 }}>
            <span className="text-xs text-muted">⌕</span>
            <input type="text" placeholder="search" value={search} onChange={e => setSearch(e.target.value)} />
          </div>
          <select className="field" style={{ minWidth: 90 }} value={typeFilter} onChange={e => setTypeFilter(e.target.value)}>
            <option value="all">all</option>
            <option value="asset">asset</option>
            <option value="liability">liability</option>
            <option value="equity">equity</option>
            <option value="revenue">revenue</option>
            <option value="expense">expense</option>
          </select>
          <MonthPicker value={period} onChange={setPeriod} />
          <button className="pill" data-active={postedOnly} onClick={() => setPostedOnly(v => !v)}>posted only</button>
          <Link href="/dashboard/export" className="pill ml-auto no-underline">Export</Link>
        </div>

        {!loading && entryIds.length === 0 && (
          <div className="mb-3 px-3 py-2 rounded text-xs text-ink-2 bg-surface border border-paper-edge">
            No {postedOnly ? 'posted ' : ''}entries found for this period.
            {postedOnly && (
              <button className="ml-1 text-accent underline" onClick={() => setPostedOnly(false)}>
                Show unposted too
              </button>
            )}
          </div>
        )}

        <div className="card overflow-hidden">
          <table className="w-full">
            <thead className="t-head">
              <tr>
                <th>Code</th><th>Account</th>
                <th className="num">Open</th><th className="num">Dr</th>
                <th className="num">Cr</th><th className="num">Close</th>
              </tr>
            </thead>
            <tbody>
              {loading
                ? [...Array(8)].map((_,i) => (
                    <tr key={i} className="t-row">
                      {[...Array(6)].map((_,j) => (
                        <td key={j} className="t-cell">
                          <div className="h-3 rounded animate-pulse bg-paper-edge" style={{ width: j === 1 ? 120 : 60 }} />
                        </td>
                      ))}
                    </tr>
                  ))
                : filtered.length === 0
                  ? (
                    <tr>
                      <td colSpan={6} className="t-cell text-center text-ink-2 py-8">
                        No accounts match your filter.
                      </td>
                    </tr>
                  )
                : filtered.map(row => (
                    <tr key={row.id} className="t-row t-row-clickable" data-selected={selected?.id === row.id}
                      onClick={() => selectAccount(row)}>
                      <td className="t-cell num text-ink-2">{row.code}</td>
                      <td className="t-cell">{row.name}</td>
                      <td className="t-cell num text-ink-2">{row.open !== 0 ? row.open.toLocaleString('en-ZA', { minimumFractionDigits: 0 }) : '–'}</td>
                      <td className="t-cell num">{row.dr > 0 ? row.dr.toLocaleString('en-ZA', { minimumFractionDigits: 0 }) : '0'}</td>
                      <td className="t-cell num text-ink-2">{row.cr > 0 ? row.cr.toLocaleString('en-ZA', { minimumFractionDigits: 0 }) : '0'}</td>
                      <td className={`t-cell num font-semibold ${row.close < 0 ? 'text-negative' : ''}`}>
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

      {selected && (
        <div className="w-64 shrink-0 border-l border-paper-edge p-4 overflow-auto bg-surface">
          <div className="flex items-center justify-between mb-3">
            <span className="text-sm font-semibold">{selected.code} · {selected.name}</span>
            <button className="text-xs text-accent">open full ↗</button>
          </div>

          <div className="rounded overflow-hidden mb-3" style={{ border: '1.5px solid var(--ink)' }}>
            <div className="flex" style={{ minHeight: 80 }}>
              <div className="flex-1 p-2 border-r border-ink">
                <p className="text-2xs font-medium mb-1 text-ink-2">DR</p>
                {tLines.filter(l => l.dr > 0).map((l,i) => (
                  <div key={i} className="mb-1">
                    <p className="text-muted" style={{ fontSize: 10 }}>{l.date} {l.label.slice(0,12)}</p>
                    <p className="num text-2xs">{l.dr.toLocaleString('en-ZA', { minimumFractionDigits: 0 })}</p>
                  </div>
                ))}
              </div>
              <div className="flex-1 p-2">
                <p className="text-2xs font-medium mb-1 text-ink-2">CR</p>
                {tLines.filter(l => l.cr > 0).map((l,i) => (
                  <div key={i} className="mb-1">
                    <p className="text-muted" style={{ fontSize: 10 }}>{l.date} {l.label.slice(0,12)}</p>
                    <p className="num text-2xs">{l.cr.toLocaleString('en-ZA', { minimumFractionDigits: 0 })}</p>
                  </div>
                ))}
              </div>
            </div>
            <div className="px-2 py-1.5 flex justify-between border-t bg-paper" style={{ borderColor: 'var(--ink)' }}>
              <span className="text-2xs font-medium">Bal.</span>
              <span className="num text-xs font-bold">{formatMoney(Math.abs(tBal))} {tBal >= 0 ? 'Dr' : 'Cr'}</span>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-2 mb-3">
            <div className="card p-2">
              <p className="text-2xs text-ink-2">Movement</p>
              <p className="num text-xs font-semibold">{formatMoney(tBal)}</p>
            </div>
            <div className="card-accent p-2">
              <p className="text-2xs text-ink-2">vs last period</p>
              <p className="num text-xs font-semibold text-accent">+R 0</p>
            </div>
          </div>

          <p className="text-2xs text-muted notice notice-dashed">
            click any line → source doc · hover for context
          </p>
        </div>
      )}
    </div>
  )
}
