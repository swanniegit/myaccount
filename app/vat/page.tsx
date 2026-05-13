'use client'
import { useState } from 'react'
import Button from '@/components/ui/Button'
import MonthPicker, { currentMonth, type MonthValue } from '@/components/ui/MonthPicker'

const STEPS = ['1 Output VAT', '2 Input VAT', '3 Adjustments', '4 Review & submit']

const OUTPUT_BOXES = [
  { box: '1', label: 'Standard rated supplies (15%)', excl: 62993, vat: 9449 },
  { box: '2', label: 'Zero-rated supplies', excl: null, vat: null },
  { box: '3', label: 'Exempt supplies', excl: null, vat: null },
  { box: '4', label: 'Goods/services for own use', excl: null, vat: null },
  { box: '5', label: 'Exports', excl: null, vat: null },
]

const INPUT_BOXES = [
  { box: '14', label: 'Capital goods (15%)', excl: null, vat: null },
  { box: '15', label: 'Other goods/services (15%)', excl: 38720, vat: 5808 },
  { box: '16', label: 'Imports (15%)', excl: null, vat: null },
  { box: '17', label: 'Change in use', excl: null, vat: null },
  { box: '18', label: 'Bad debts', excl: null, vat: null },
  { box: '19', label: 'Other', excl: null, vat: null },
]

const MONTH_NAMES = ['January','February','March','April','May','June','July','August','September','October','November','December']

export default function VATPage() {
  const [step, setStep] = useState(1)
  const [period, setPeriod] = useState<MonthValue>(currentMonth)

  const outputVAT = 9449
  const inputVAT = 5808
  const payable = outputVAT - inputVAT

  const periodCode = `${period.year}${String(period.month + 1).padStart(2, '0')}`
  const periodName = `${MONTH_NAMES[period.month]} ${period.year}`

  const dueDate = new Date(period.year, period.month + 2, 25)
  const dueDateStr = `${dueDate.getDate()} ${MONTH_NAMES[dueDate.getMonth()].slice(0, 3)}`

  return (
    <div className="p-5 max-w-4xl">
      <div className="flex items-start justify-between mb-1">
        <div>
          <h1 className="text-xl font-semibold">VAT 201 · SARS submission</h1>
          <p className="text-xs mt-0.5 text-ink-2">Period {periodCode} · standard 15%</p>
        </div>
        <div className="flex gap-2 items-center">
          <MonthPicker value={period} onChange={setPeriod} />
          <Button variant="secondary" size="sm">Open SARS form</Button>
          <Button variant="ghost" size="sm">Save draft</Button>
          <Button size="sm">Submit via eFiling →</Button>
        </div>
      </div>

      <div className="mb-4">
        <div className="text-base font-semibold">VAT 201 · {periodName}</div>
        <div className="text-xs text-ink-2">Period {periodCode} · due {dueDateStr} · eFiling user TG-44</div>
      </div>

      <div className="flex gap-1.5 mb-4">
        {STEPS.map((s, i) => (
          <button key={s} onClick={() => setStep(i)} className="pill" data-active={step === i}>
            {s}
          </button>
        ))}
      </div>

      <div className="flex gap-4">
        <div className="flex-1">
          {step === 0 && <VATBoxes title="Output VAT (sales)" boxes={OUTPUT_BOXES} totalLabel="Box 13 · Total output tax" totalVAT={outputVAT} />}
          {step === 1 && (
            <>
              <VATBoxes title="Input VAT (claims from suppliers)" boxes={INPUT_BOXES} totalLabel="Box 20 · Total input tax" totalVAT={inputVAT} />
              <div className="notice notice-dashed mt-3 text-xs italic">
                23 SARS-compliant tax invoices on file backing this claim · 1 missing VAT no. ⚠
              </div>
            </>
          )}
          {step === 2 && (
            <div className="card p-5 text-xs">
              <div className="text-sm font-medium mb-3">Adjustments</div>
              <p className="text-muted">No adjustments this period.</p>
            </div>
          )}
          {step === 3 && (
            <div className="card p-5 text-xs">
              <div className="text-sm font-medium mb-3">Review &amp; submit</div>
              <div className="space-y-2 mb-4">
                <div className="flex justify-between">
                  <span className="text-ink-2">Output VAT (Box 13)</span>
                  <span className="num">{outputVAT.toLocaleString('en-ZA', { minimumFractionDigits: 2 })}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-ink-2">Input VAT (Box 20)</span>
                  <span className="num">{inputVAT.toLocaleString('en-ZA', { minimumFractionDigits: 2 })}</span>
                </div>
                <div className="flex justify-between font-semibold pt-2 border-t border-paper-edge">
                  <span>VAT payable</span>
                  <span className="num text-accent">R {payable.toLocaleString('en-ZA', { minimumFractionDigits: 2 })}</span>
                </div>
              </div>
              <Button size="sm" onClick={() => alert('eFiling submission — connect SARS API')}>
                Submit via eFiling →
              </Button>
            </div>
          )}
        </div>

        <div className="w-56 shrink-0 card-accent p-4">
          <div className="text-xs font-medium mb-3">This return · {periodName}</div>
          <div className="space-y-1.5 mb-3 text-xs">
            <div className="flex justify-between">
              <span className="text-ink-2">Output VAT (Box 13)</span>
              <span className="num">{outputVAT.toLocaleString('en-ZA', { minimumFractionDigits: 2 })}</span>
            </div>
            <div className="flex justify-between pb-2" style={{ borderBottom: '1px solid rgba(217,119,87,0.3)' }}>
              <span className="text-ink-2">Input VAT (Box 20)</span>
              <span className="num">{inputVAT.toLocaleString('en-ZA', { minimumFractionDigits: 2 })}</span>
            </div>
            <div className="flex justify-between items-baseline pt-1">
              <span className="font-medium">Payable</span>
              <span className="num font-bold text-base text-accent">R {payable.toLocaleString('en-ZA', { minimumFractionDigits: 2 })}</span>
            </div>
          </div>

          <div className="text-xs font-medium mb-1.5">Will post on submission</div>
          <div className="num space-y-0.5 text-ink-2" style={{ fontSize: 11 }}>
            <div>Dr 2220 VAT Output ... {outputVAT.toLocaleString('en-ZA', { minimumFractionDigits: 2 })}</div>
            <div>Cr 2210 VAT Input .... {inputVAT.toLocaleString('en-ZA', { minimumFractionDigits: 2 })}</div>
            <div>Cr 2200 SARS payable . {payable.toLocaleString('en-ZA', { minimumFractionDigits: 2 })}</div>
          </div>
        </div>
      </div>
    </div>
  )
}

function VATBoxes({ title, boxes, totalLabel, totalVAT }: {
  title: string
  boxes: { box: string; label: string; excl: number | null; vat: number | null }[]
  totalLabel: string
  totalVAT: number
}) {
  return (
    <div className="card overflow-hidden">
      <div className="px-4 py-2.5 text-xs font-medium italic bg-paper border-b border-paper-edge">
        {title}
      </div>
      <table className="w-full text-xs">
        <thead className="t-head">
          <tr>
            <th className="text-left w-10">Box</th>
            <th className="text-left">Field</th>
            <th className="text-right w-28">Excl</th>
            <th className="text-right w-24">VAT</th>
          </tr>
        </thead>
        <tbody>
          {boxes.map(b => (
            <tr key={b.box} className="t-row">
              <td className="t-cell num text-accent">{b.box}</td>
              <td className="t-cell">{b.label}</td>
              <td className="t-cell num">{b.excl != null ? b.excl.toLocaleString('en-ZA', { minimumFractionDigits: 2 }) : '—'}</td>
              <td className="t-cell num">{b.vat != null ? b.vat.toLocaleString('en-ZA', { minimumFractionDigits: 2 }) : '—'}</td>
            </tr>
          ))}
        </tbody>
        <tfoot>
          <tr style={{ background: 'var(--accent-soft)', borderTop: '2px solid var(--paper-edge)' }}>
            <td />
            <td className="px-3 py-2 text-xs font-semibold" colSpan={2}>{totalLabel}</td>
            <td className="px-3 py-2 num font-semibold">{totalVAT.toLocaleString('en-ZA', { minimumFractionDigits: 2 })}</td>
          </tr>
        </tfoot>
      </table>
    </div>
  )
}
