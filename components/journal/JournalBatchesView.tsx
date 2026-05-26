'use client'
import { useState, useEffect } from 'react'
import { supabase } from '@/lib/supabase'
import MonthPicker, { currentMonth, monthRange, type MonthValue } from '@/components/ui/MonthPicker'
import { formatDate } from '@/lib/utils'

interface Batch {
  id: string
  journalNumber: number | null
  date: string
  description: string
  source: string
  reference: string | null
  lineCount: number
  total: number
}

const money = (n: number) => n.toLocaleString('en-ZA', { minimumFractionDigits: 2 })

export default function JournalBatchesView() {
  const [batches, setBatches] = useState<Batch[]>([])
  const [loading, setLoading] = useState(true)
  const [period, setPeriod]   = useState<MonthValue>(currentMonth())

  useEffect(() => { load() }, [period])

  async function load() {
    setLoading(true)
    const { start, end } = monthRange(period)
    const { data: entries } = await supabase
      .from('acct_journal_entries')
      .select('id, date, description, source, reference, journal_number')
      .gte('date', start).lt('date', end)
      .eq('is_posted', true)
      .order('date', { ascending: false })
      .order('journal_number', { ascending: false })
    const ids = (entries ?? []).map(e => e.id)
    if (ids.length === 0) { setBatches([]); setLoading(false); return }

    const totals = new Map<string, { total: number; count: number }>()
    const BATCH = 500
    for (let i = 0; i < ids.length; i += BATCH) {
      const { data: lines } = await supabase
        .from('acct_journal_lines').select('entry_id, debit')
        .in('entry_id', ids.slice(i, i + BATCH))
      for (const l of lines ?? []) {
        const t = totals.get(l.entry_id) ?? { total: 0, count: 0 }
        t.total += Number(l.debit)
        t.count += 1
        totals.set(l.entry_id, t)
      }
    }

    setBatches((entries ?? []).map(e => ({
      id: e.id,
      journalNumber: e.journal_number,
      date: e.date,
      description: e.description,
      source: e.source,
      reference: e.reference,
      lineCount: totals.get(e.id)?.count ?? 0,
      total: totals.get(e.id)?.total ?? 0,
    })))
    setLoading(false)
  }

  return (
    <div className="p-5 flex flex-col gap-4">
      <div>
        <h1 className="text-xl font-semibold">Journal Batches</h1>
        <p className="text-xs mt-0.5 text-ink-2">Posted journal entries · {batches.length} this period</p>
      </div>

      <div className="flex gap-2">
        <MonthPicker value={period} onChange={setPeriod} />
      </div>

      <div className="card overflow-hidden">
        <table className="w-full">
          <thead className="t-head">
            <tr>
              <th>JE#</th><th>Date</th><th>Description</th><th>Source</th><th>Reference</th>
              <th className="num">Lines</th><th className="num">Total</th>
            </tr>
          </thead>
          <tbody>
            {loading
              ? [...Array(6)].map((_, i) => (
                  <tr key={i} className="t-row">
                    {[...Array(7)].map((_, j) => (
                      <td key={j} className="t-cell"><div className="h-3 rounded animate-pulse bg-paper-edge" /></td>
                    ))}
                  </tr>
                ))
              : batches.map(b => (
                  <tr key={b.id} className="t-row">
                    <td className="t-cell num text-ink-2">{b.journalNumber ?? '—'}</td>
                    <td className="t-cell num text-ink-2">{formatDate(b.date)}</td>
                    <td className="t-cell font-medium">{b.description}</td>
                    <td className="t-cell"><span className="badge badge-draft">{b.source}</span></td>
                    <td className="t-cell text-ink-2">{b.reference ?? '—'}</td>
                    <td className="t-cell num text-ink-2">{b.lineCount}</td>
                    <td className="t-cell num font-semibold">{money(b.total)}</td>
                  </tr>
                ))}
            {!loading && batches.length === 0 && (
              <tr className="t-empty"><td colSpan={7}>No posted entries this period</td></tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  )
}
