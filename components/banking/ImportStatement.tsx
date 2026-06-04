'use client'
import { useRef, useState } from 'react'
import { parseCsv } from '@/lib/csv'
import { parseStatementCsv, type ParsedStatement } from '@/lib/banking/parse-statement-csv'
import { formatMoney } from '@/lib/utils'
import Button from '@/components/ui/Button'
import type { BankAccountLite } from './types'

type Result = { inserted: number; skipped: number }

export default function ImportStatement({ account, onImported }: { account: BankAccountLite; onImported: () => void }) {
  const fileRef = useRef<HTMLInputElement>(null)
  const [parsed, setParsed] = useState<ParsedStatement | null>(null)
  const [fileName, setFileName] = useState('')
  const [importing, setImporting] = useState(false)
  const [result, setResult] = useState<Result | null>(null)
  const [error, setError] = useState<string | null>(null)

  function reset() {
    setParsed(null); setFileName(''); setResult(null); setError(null)
    if (fileRef.current) fileRef.current.value = ''
  }

  async function onFile(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file) return
    setResult(null); setError(null)
    setFileName(file.name)
    try {
      setParsed(parseStatementCsv(parseCsv(await file.text())))
    } catch {
      setError('Could not read that file.')
    }
  }

  async function doImport() {
    if (!parsed) return
    setImporting(true); setError(null)
    try {
      const res = await fetch('/api/banking/import', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          accountNumber: parsed.accountNumber ?? account.account_number,
          closingBalance: parsed.closingBalance,
          transactions: parsed.transactions,
        }),
      })
      const body = await res.json()
      if (!res.ok) { setError(body.error ?? 'Import failed'); return }
      setResult(body as Result)
      setParsed(null)
      onImported()
    } catch {
      setError('Network error')
    } finally {
      setImporting(false)
    }
  }

  const numberMismatch = parsed?.accountNumber && parsed.accountNumber !== account.account_number

  return (
    <div className="relative">
      <input ref={fileRef} type="file" accept=".csv,text/csv" onChange={onFile} className="hidden" />
      <Button size="sm" variant="secondary" onClick={() => fileRef.current?.click()}>Import CSV</Button>

      {(parsed || result || error) && (
        <div className="absolute right-0 mt-2 z-20 w-80 card p-3 text-xs shadow-lg" style={{ background: 'var(--surface)' }}>
          {fileName && <p className="font-medium mb-2 truncate">{fileName}</p>}

          {error && <p className="text-negative mb-2">{error}</p>}

          {result && (
            <div className="mb-1">
              <p className="font-medium text-positive">Imported {result.inserted} transaction{result.inserted === 1 ? '' : 's'}.</p>
              {result.skipped > 0 && <p className="text-ink-2 mt-0.5">{result.skipped} skipped (already imported).</p>}
              <p className="text-ink-2 mt-1" style={{ fontSize: 11 }}>Switch months to see lines outside the current period.</p>
            </div>
          )}

          {parsed && (
            <>
              <div className="space-y-0.5 mb-2">
                <Row label="Account" value={parsed.accountNumber ?? '—'} />
                <Row label="Transactions" value={String(parsed.transactions.length)} />
                {parsed.closingBalance != null && <Row label="Closing balance" value={formatMoney(parsed.closingBalance)} />}
              </div>

              {numberMismatch && (
                <p className="text-negative mb-2" style={{ fontSize: 11 }}>
                  This file is for account {parsed.accountNumber}, not {account.account_number}.
                </p>
              )}
              {parsed.errors.length > 0 && (
                <div className="mb-2 text-ink-2" style={{ fontSize: 11 }}>
                  <p className="text-negative">{parsed.errors.length} row(s) skipped:</p>
                  {parsed.errors.slice(0, 3).map((er, i) => <p key={i} className="truncate">{er}</p>)}
                  {parsed.errors.length > 3 && <p>…and {parsed.errors.length - 3} more</p>}
                </div>
              )}

              <div className="flex gap-2">
                <Button size="sm" onClick={doImport} disabled={importing || parsed.transactions.length === 0 || !!numberMismatch}>
                  {importing ? 'Importing…' : `Import ${parsed.transactions.length}`}
                </Button>
                <Button size="sm" variant="ghost" onClick={reset}>Cancel</Button>
              </div>
            </>
          )}

          {result && <Button size="sm" variant="ghost" className="mt-1" onClick={reset}>Close</Button>}
        </div>
      )}
    </div>
  )
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex justify-between">
      <span className="text-ink-2">{label}</span>
      <span className="num">{value}</span>
    </div>
  )
}
