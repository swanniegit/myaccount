'use client'
import { useState } from 'react'
import Link from 'next/link'
import { supabase } from '@/lib/supabase'
import { toCsv } from '@/lib/csv'
import { fetchTransactionalExport } from '@/lib/export/transactional'
import { today } from '@/lib/utils'

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
    if (from > to) { setMsg('“From” date must be on or before “To” date.'); return }
    setBusy(true)
    setMsg(null)
    try {
      const { header, rows } = await fetchTransactionalExport(supabase, from, to)
      if (rows.length === 0) { setMsg('No posted entries in this date range.'); return }
      downloadCsv(toCsv([header, ...rows]), `transactions_${from}_to_${to}.csv`)
      setMsg(`Exported ${rows.length} posted lines.`)
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
