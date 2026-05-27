'use client'
import { useCallback, useState, useEffect, useMemo } from 'react'
import { supabase } from '@/lib/supabase'
import MonthPicker, { currentMonth, monthRange, type MonthValue } from '@/components/ui/MonthPicker'
import { formatDate } from '@/lib/utils'

interface Row {
  date: string
  journalNumber: number | null
  code: string
  account: string
  description: string
  debit: number
  credit: number
}

const money = (n: number) => n.toLocaleString('en-ZA', { minimumFractionDigits: 2 })

export default function AccountTransactionsView() {
  const [rows, setRows]       = useState<Row[]>([])
  const [search, setSearch]   = useState('')
  const [loading, setLoading] = useState(true)
  const [period, setPeriod]   = useState<MonthValue>(currentMonth())

  const load = useCallback(async () => {
    setLoading(true)
    const { start, end } = monthRange(period)
    const { data: entries } = await supabase
      .from('acct_journal_entries')
      .select('id, date, description, journal_number')
      .gte('date', start).lt('date', end)
      .eq('is_posted', true)
    const ids = (entries ?? []).map(e => e.id)
    if (ids.length === 0) { setRows([]); setLoading(false); return }

    const entryMap = new Map(
      (entries ?? []).map(e => [e.id, { date: e.date, description: e.description, journal_number: e.journal_number }])
    )

    const lines: { entry_id: string; debit: number; credit: number; description: string | null; acct_accounts: { code: string; name: string } | null }[] = []
    const BATCH = 500
    for (let i = 0; i < ids.length; i += BATCH) {
      const { data } = await supabase
        .from('acct_journal_lines')
        .select('entry_id, debit, credit, description, acct_accounts(code, name)')
        .in('entry_id', ids.slice(i, i + BATCH))
      if (data) lines.push(...(data as any))
    }

    const result: Row[] = lines.map(l => {
      const e = entryMap.get(l.entry_id)
      return {
        date: e?.date ?? '',
        journalNumber: e?.journal_number ?? null,
        code: l.acct_accounts?.code ?? '—',
        account: l.acct_accounts?.name ?? '—',
        description: l.description ?? e?.description ?? '—',
        debit: Number(l.debit),
        credit: Number(l.credit),
      }
    })
    result.sort((a, b) => a.date.localeCompare(b.date) || (a.journalNumber ?? 0) - (b.journalNumber ?? 0))
    setRows(result)
    setLoading(false)
  }, [period])

  useEffect(() => { load() }, [load])

  const filtered = useMemo(() => {
    if (!search) return rows
    const q = search.toLowerCase()
    return rows.filter(r =>
      r.account.toLowerCase().includes(q) || r.code.includes(q) || r.description.toLowerCase().includes(q)
    )
  }, [rows, search])

  const totalDr = filtered.reduce((s, r) => s + r.debit, 0)
  const totalCr = filtered.reduce((s, r) => s + r.credit, 0)

  return (
    <div className="flex-1 p-5 overflow-auto">
      <h1 className="text-xl font-semibold mb-0.5">Account Transactions</h1>
      <p className="text-xs mb-4 text-ink-2">Posted journal lines · chronological · {filtered.length} lines</p>

      <div className="flex gap-2 mb-3">
        <div className="search-box" style={{ width: 240 }}>
          <span className="text-xs text-muted">⌕</span>
          <input type="text" placeholder="account or description" value={search} onChange={e => setSearch(e.target.value)} />
        </div>
        <MonthPicker value={period} onChange={setPeriod} />
      </div>

      <div className="card overflow-hidden">
        <table className="w-full">
          <thead className="t-head">
            <tr>
              <th>Date</th><th>JE#</th><th>Account</th><th>Description</th>
              <th className="num">Dr</th><th className="num">Cr</th>
            </tr>
          </thead>
          <tbody>
            {loading
              ? [...Array(8)].map((_, i) => (
                  <tr key={i} className="t-row">
                    {[...Array(6)].map((_, j) => (
                      <td key={j} className="t-cell"><div className="h-3 rounded animate-pulse bg-paper-edge" /></td>
                    ))}
                  </tr>
                ))
              : filtered.map((r, i) => (
                  <tr key={i} className="t-row">
                    <td className="t-cell num text-ink-2">{formatDate(r.date)}</td>
                    <td className="t-cell num text-ink-2">{r.journalNumber ?? '—'}</td>
                    <td className="t-cell"><span className="num text-ink-2 mr-1">{r.code}</span>{r.account}</td>
                    <td className="t-cell">{r.description}</td>
                    <td className="t-cell num">{r.debit > 0 ? money(r.debit) : '–'}</td>
                    <td className="t-cell num text-ink-2">{r.credit > 0 ? money(r.credit) : '–'}</td>
                  </tr>
                ))}
            {!loading && filtered.length === 0 && (
              <tr className="t-empty"><td colSpan={6}>No posted transactions this period</td></tr>
            )}
            {!loading && filtered.length > 0 && (
              <tr style={{ borderTop: '2px solid var(--paper-edge)' }}>
                <td className="t-cell font-semibold" colSpan={4}>Total</td>
                <td className="t-cell num font-bold">{money(totalDr)}</td>
                <td className="t-cell num font-bold">{money(totalCr)}</td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  )
}
