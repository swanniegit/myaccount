'use client'
import { useState } from 'react'
import Button from '@/components/ui/Button'

interface BankRow {
  id: string
  date: string
  description: string
  amount: number
}

interface BookRow {
  id: string
  date: string
  ref: string
  description: string
  accounts: string
  amount: number
}

const BANK_ROWS: BankRow[] = [
  { id: 'b1', date: '14/03', description: 'POS Pick n Pay 12345', amount: 3200 },
  { id: 'b2', date: '13/03', description: 'EFT Rent City of CT', amount: -8000 },
  { id: 'b3', date: '12/03', description: 'DD Eskom 9988', amount: -1741 },
  { id: 'b4', date: '11/03', description: 'Salaries batch', amount: -12000 },
  { id: 'b5', date: '10/03', description: 'Card fee', amount: -45 },
]

const BOOK_ROWS: BookRow[] = [
  { id: 'k1', date: '14/03', ref: 'INV-102 – Pick n Pay', description: '', accounts: 'Dr 1000 / Cr 4000+2220', amount: 3200 },
  { id: 'k2', date: '13/03', ref: 'BILL-44 – Rent', description: '', accounts: 'Cr 1000 / Dr 5100', amount: -8000 },
  { id: 'k3', date: '12/03', ref: 'BILL-45 – Eskom', description: '', accounts: 'Cr 1000 / Dr 5200+2210', amount: -1741 },
  { id: 'k4', date: '11/03', ref: 'SAL-08 – Wages', description: '', accounts: 'Cr 1000 / Dr 5300', amount: -12000 },
]

export default function BankingPage() {
  const [matched, setMatched] = useState<string[]>(['b1', 'b2', 'b3', 'b4'])

  const needsReview = BANK_ROWS.length - matched.length
  const autoMatched = matched.length

  function toggleMatch(bankId: string) {
    setMatched(prev =>
      prev.includes(bankId) ? prev.filter(id => id !== bankId) : [...prev, bankId]
    )
  }

  return (
    <div className="p-5 max-w-4xl">
      <div className="flex items-start justify-between mb-4">
        <div>
          <h1 className="text-xl font-semibold">Bank reconciliation</h1>
          <p className="text-xs mt-0.5" style={{ color: 'var(--ink-2)' }}>
            FNB Cheque · matching imported txns to your books
          </p>
        </div>
        <div className="flex gap-2">
          <Button variant="secondary" size="sm">Re-import</Button>
          <Button size="sm">Finish reconcile</Button>
        </div>
      </div>

      {/* Account + stats */}
      <div className="mb-4">
        <div className="text-sm font-semibold mb-0.5">FNB Cheque · 62-0014...3201</div>
        <div className="text-xs mb-3" style={{ color: 'var(--ink-2)' }}>
          Last import 14/03 · {BANK_ROWS.length} txns to review
        </div>
        <div className="grid grid-cols-4 gap-3">
          <StatBox label="Imported" value={String(BANK_ROWS.length)} />
          <StatBox label="Auto-matched" value={String(autoMatched)} />
          <StatBox label="Needs review" value={String(needsReview)} accent={needsReview > 0} />
          <StatBox label="Closing balance" value="R (641)" />
        </div>
      </div>

      {/* Two-column match view */}
      <div className="grid grid-cols-[1fr_40px_1fr] gap-0 rounded-lg overflow-hidden" style={{ border: '1px solid var(--paper-edge)' }}>
        {/* Bank statement header */}
        <div className="px-3 py-2 text-xs font-medium" style={{ background: 'var(--paper-edge)', color: 'var(--ink-2)' }}>
          Bank statement
        </div>
        <div style={{ background: 'var(--paper-edge)' }} />
        <div className="px-3 py-2 text-xs font-medium" style={{ background: 'var(--paper-edge)', color: 'var(--ink-2)' }}>
          Your books
        </div>

        {/* Rows */}
        {BANK_ROWS.map((bank, i) => {
          const book = BOOK_ROWS[i]
          const isMatched = matched.includes(bank.id)
          const rowBg = i % 2 === 0 ? 'var(--surface)' : 'var(--paper)'

          return (
            <>
              {/* Bank side */}
              <div
                key={`b-${bank.id}`}
                className="px-3 py-2 text-xs flex justify-between items-center"
                style={{
                  background: bank.amount > 0 ? 'var(--accent-soft)' : rowBg,
                  borderBottom: '1px solid var(--paper-edge)',
                }}
              >
                <div>
                  <span className="font-mono mr-2" style={{ color: 'var(--ink-2)', fontSize: 11 }}>{bank.date}</span>
                  <span>{bank.description}</span>
                </div>
                <span
                  className="font-mono font-semibold"
                  style={{ color: bank.amount > 0 ? 'var(--accent)' : 'var(--ink)' }}
                >
                  {bank.amount > 0 ? '' : ''}{bank.amount.toLocaleString('en-ZA', { minimumFractionDigits: 2 })}
                </span>
              </div>

              {/* Match indicator */}
              <div
                key={`m-${bank.id}`}
                className="flex items-center justify-center"
                style={{ background: rowBg, borderBottom: '1px solid var(--paper-edge)' }}
                onClick={() => toggleMatch(bank.id)}
              >
                <button
                  className="w-6 h-6 rounded-full flex items-center justify-center text-xs transition-colors"
                  style={{
                    border: `1.5px solid ${isMatched ? 'var(--positive)' : book ? 'var(--muted)' : 'var(--accent)'}`,
                    color: isMatched ? 'var(--positive)' : book ? 'var(--muted)' : 'var(--accent)',
                    background: 'transparent',
                  }}
                >
                  {isMatched ? '✓' : book ? '✓' : '?'}
                </button>
              </div>

              {/* Books side */}
              <div
                key={`k-${bank.id}`}
                className="px-3 py-2 text-xs"
                style={{
                  background: !book ? 'rgba(217,119,87,0.08)' : rowBg,
                  borderBottom: '1px solid var(--paper-edge)',
                }}
              >
                {book ? (
                  <div className="flex justify-between items-start">
                    <div>
                      <span className="font-mono mr-2" style={{ color: 'var(--ink-2)', fontSize: 11 }}>{book.date}</span>
                      <span className="font-medium">{book.ref}</span>
                      <div style={{ color: 'var(--muted)', fontSize: 11 }}>{book.accounts}</div>
                    </div>
                    <span className="font-mono font-semibold">{book.amount.toLocaleString('en-ZA', { minimumFractionDigits: 2 })}</span>
                  </div>
                ) : (
                  <div>
                    <div className="font-medium" style={{ color: 'var(--accent)' }}>no match found</div>
                    <div style={{ color: 'var(--ink-2)', fontSize: 11 }}>suggested: Dr 5400 Bank charges</div>
                  </div>
                )}
              </div>
            </>
          )
        })}
      </div>

      {/* Hint bar */}
      <div
        className="mt-3 px-3 py-2 rounded text-xs"
        style={{ border: '1px dashed var(--paper-edge)', color: 'var(--ink-2)', fontStyle: 'italic' }}
      >
        {needsReview} needs review · ⌘↑ accept suggestion · drag bank row → book row to match manually
      </div>
    </div>
  )
}

function StatBox({ label, value, accent }: { label: string; value: string; accent?: boolean }) {
  return (
    <div
      className="rounded-lg p-3"
      style={{
        background: 'var(--surface)',
        border: `1px solid ${accent ? 'var(--accent)' : 'var(--paper-edge)'}`,
      }}
    >
      <div className="text-xs mb-1" style={{ color: accent ? 'var(--accent)' : 'var(--ink-2)' }}>{label}</div>
      <div className="font-mono text-xl font-bold" style={{ color: accent ? 'var(--accent)' : 'var(--ink)' }}>{value}</div>
    </div>
  )
}
