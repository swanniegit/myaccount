'use client'
import { useState } from 'react'
import Link from 'next/link'
import { supabase } from '@/lib/supabase'
import { toCsv } from '@/lib/csv'
import { today } from '@/lib/utils'

interface LineRow {
  entry_id: string
  debit: number
  credit: number
  description: string | null
  acct_accounts: { code: string; name: string } | null
}
interface EntryRow {
  id: string
  date: string
  journal_number: number | null
  reference: string | null
  source: string
  description: string
}

function firstOfMonth() {
  const d = new Date()
  return new Date(d.getFullYear(), d.getMonth(), 1).toISOString().slice(0, 10)
}

function downloadCsv(csv: string, filename: string) {
  const blob = new Blob(['﻿' + csv], { type: 'text/csv;charset=utf-8;' })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = filename
  a.click()
  URL.revokeObjectURL(url)
}

export default function TransactionalExportPage() {
  const [from, setFrom] = useState(firstOfMonth())
  const [to, setTo]     = useState(today())
  const [busy, setBusy] = useState(false)
  const [msg, setMsg]   = useState<string | null>(null)

  async function exportCsv() {
    setBusy(true)
    setMsg(null)
    try {
      const { data: entries } = await supabase
        .from('acct_journal_entries')
        .select('id, date, journal_number, reference, source, description')
        .gte('date', from).lte('date', to)
        .eq('is_posted', true)
        .order('date', { ascending: true })
        .order('journal_number', { ascending: true })

      const ids = (entries ?? []).map(e => e.id)
      if (ids.length === 0) { setMsg('No posted entries in this date range.'); return }
      const entryMap = new Map<string, EntryRow>((entries as EntryRow[]).map(e => [e.id, e]))

      const lines: LineRow[] = []
      const BATCH = 500
      for (let i = 0; i < ids.length; i += BATCH) {
        const { data } = await supabase
          .from('acct_journal_lines')
          .select('entry_id, debit, credit, description, acct_accounts(code, name)')
          .in('entry_id', ids.slice(i, i + BATCH))
        if (data) lines.push(...(data as any))
      }

      const header = ['Date', 'JE#', 'Account code', 'Account', 'Description', 'Debit', 'Credit', 'Source', 'Reference']
      const body = lines
        .map(l => {
          const e = entryMap.get(l.entry_id)
          return {
            sortDate: e?.date ?? '',
            sortJe: e?.journal_number ?? 0,
            cells: [
              e?.date ?? '',
              e?.journal_number ?? '',
              l.acct_accounts?.code ?? '',
              l.acct_accounts?.name ?? '',
              l.description ?? e?.description ?? '',
              Number(l.debit).toFixed(2),
              Number(l.credit).toFixed(2),
              e?.source ?? '',
              e?.reference ?? '',
            ],
          }
        })
        .sort((a, b) => a.sortDate.localeCompare(b.sortDate) || a.sortJe - b.sortJe)
        .map(r => r.cells)

      downloadCsv(toCsv([header, ...body]), `transactions_${from}_to_${to}.csv`)
      setMsg(`Exported ${body.length} posted lines.`)
    } catch (e) {
      setMsg(e instanceof Error ? e.message : 'Export failed')
    } finally {
      setBusy(false)
    }
  }

  return (
    <div className="p-5 max-w-2xl">
      <div className="mb-4">
        <Link href="/dashboard" className="text-xs text-accent hover:underline">← Die General Ledger</Link>
        <h1 className="text-xl font-semibold mt-1">Transactional Export</h1>
        <p className="text-xs mt-0.5 text-ink-2">CSV of posted journal lines for a date range</p>
      </div>

      <div className="card p-5">
        <div className="flex gap-3 items-end flex-wrap">
          <div>
            <label className="field-label">From</label>
            <input type="date" className="field" value={from} onChange={e => setFrom(e.target.value)} />
          </div>
          <div>
            <label className="field-label">To</label>
            <input type="date" className="field" value={to} onChange={e => setTo(e.target.value)} />
          </div>
          <button className="btn btn-sm btn-primary" onClick={exportCsv} disabled={busy || !from || !to}>
            {busy ? 'Exporting…' : 'Download CSV'}
          </button>
        </div>
        {msg && <p className="text-xs mt-3 text-ink-2">{msg}</p>}
        <p className="text-xs mt-3 text-muted">Posted entries only · one row per journal line · opens in Excel/Sheets.</p>
      </div>
    </div>
  )
}
