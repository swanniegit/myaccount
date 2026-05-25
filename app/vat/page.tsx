'use client'
import { useEffect, useState } from 'react'
import MonthPicker, { type MonthValue } from '@/components/ui/MonthPicker'

const STEPS = ['1 Output VAT', '2 Input VAT', '3 Adjustments', '4 Review & submit']
const MONTH_NAMES = ['January','February','March','April','May','June','July','August','September','October','November','December']

function prevMonth(v: MonthValue): MonthValue {
  return v.month === 0 ? { year: v.year - 1, month: 11 } : { year: v.year, month: v.month - 1 }
}
function monthStart(v: MonthValue) {
  return `${v.year}-${String(v.month + 1).padStart(2, '0')}-01`
}
function monthEnd(v: MonthValue) {
  const lastDay = new Date(v.year, v.month + 1, 0).getDate()
  return `${v.year}-${String(v.month + 1).padStart(2, '0')}-${String(lastDay).padStart(2, '0')}`
}

interface Vat201Data {
  revenueExcl: number
  outputVAT:   number
  inputVAT:    number
  inputExcl:   number
  netPayable:  number
  entryCount:  number
}

const ZeroData: Vat201Data = { revenueExcl: 0, outputVAT: 0, inputVAT: 0, inputExcl: 0, netPayable: 0, entryCount: 0 }

function fmt(n: number) { return n.toLocaleString('en-ZA', { minimumFractionDigits: 2 }) }

export default function VATPage() {
  const now = new Date()
  // Default: previous 2 completed months (bi-monthly SA VAT cycle)
  const defaultTo:   MonthValue = prevMonth({ year: now.getFullYear(), month: now.getMonth() })
  const defaultFrom: MonthValue = prevMonth(defaultTo)

  const [step,    setStep]    = useState(0)
  const [fromMth, setFromMth] = useState<MonthValue>(defaultFrom)
  const [toMth,   setToMth]   = useState<MonthValue>(defaultTo)
  const [data,    setData]    = useState<Vat201Data>(ZeroData)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    setLoading(true)
    const from = monthStart(fromMth)
    const to   = monthEnd(toMth)
    fetch(`/api/vat201?from=${from}&to=${to}`)
      .then(r => r.json())
      .then(d => { setData(d.error ? ZeroData : d); setLoading(false) })
      .catch(() => setLoading(false))
  }, [fromMth, toMth])

  const fromMonth = fromMth.month
  const toMonth   = toMth.month
  const fromYear  = fromMth.year
  const toYear    = toMth.year

  const periodName = fromMth.month === toMth.month && fromMth.year === toMth.year
    ? `${MONTH_NAMES[fromMonth]} ${fromYear}`
    : `${MONTH_NAMES[fromMonth].slice(0, 3)} – ${MONTH_NAMES[toMonth].slice(0, 3)} ${toYear}`

  const periodCode = `${fromYear}${String(fromMonth + 1).padStart(2, '0')}`

  const dueDate    = new Date(toYear, toMonth + 2, 25)
  const dueDateStr = `${dueDate.getDate()} ${MONTH_NAMES[dueDate.getMonth()].slice(0, 3)}`

  const OUTPUT_BOXES = [
    { box: '1',  label: 'Standard rated supplies (15%)', excl: data.revenueExcl, vat: data.outputVAT },
    { box: '2',  label: 'Zero-rated supplies',           excl: null,              vat: null },
    { box: '3',  label: 'Exempt supplies',               excl: null,              vat: null },
    { box: '4',  label: 'Goods/services for own use',    excl: null,              vat: null },
    { box: '5',  label: 'Exports',                       excl: null,              vat: null },
  ]

  const INPUT_BOXES = [
    { box: '14', label: 'Capital goods (15%)',           excl: null,              vat: null },
    { box: '15', label: 'Other goods/services (15%)',    excl: data.inputExcl > 0 ? data.inputExcl : null, vat: data.inputVAT > 0 ? data.inputVAT : null },
    { box: '16', label: 'Imports (15%)',                 excl: null,              vat: null },
    { box: '17', label: 'Change in use',                 excl: null,              vat: null },
    { box: '18', label: 'Bad debts',                     excl: null,              vat: null },
    { box: '19', label: 'Other',                         excl: null,              vat: null },
  ]

  return (
    <div className="p-5 max-w-4xl">
      <div className="flex items-start justify-between mb-1">
        <div>
          <h1 className="text-xl font-semibold">VAT 201 · SARS submission</h1>
          <p className="text-xs mt-0.5 text-ink-2">
            Period {periodCode} · standard 15% · {data.entryCount} entries
          </p>
        </div>
        <div className="flex gap-2 items-center flex-wrap justify-end">
          <div className="flex items-center gap-1 text-xs text-ink-2">
            <span>From</span>
            <MonthPicker value={fromMth} onChange={setFromMth} />
            <span>To</span>
            <MonthPicker value={toMth} onChange={setToMth} />
          </div>
          <button className="btn btn-ghost text-xs">Save draft</button>
        </div>
      </div>

      <div className="mb-4">
        <div className="text-base font-semibold">VAT 201 · {periodName}</div>
        <div className="text-xs text-ink-2">Period {periodCode} · due {dueDateStr}</div>
      </div>

      <div className="flex gap-1.5 mb-4">
        {STEPS.map((s, i) => (
          <button key={s} onClick={() => setStep(i)} className="pill" data-active={step === i}>{s}</button>
        ))}
      </div>

      <div className="flex gap-4">
        <div className="flex-1">
          {step === 0 && (
            <VATBoxes
              title="Output VAT (sales)"
              boxes={OUTPUT_BOXES}
              totalLabel="Box 13 · Total output tax"
              totalVAT={data.outputVAT}
              loading={loading}
            />
          )}
          {step === 1 && (
            <>
              <VATBoxes
                title="Input VAT (claims from suppliers)"
                boxes={INPUT_BOXES}
                totalLabel="Box 20 · Total input tax"
                totalVAT={data.inputVAT}
                loading={loading}
              />
              {data.inputVAT === 0 && !loading && (
                <div className="mt-2 px-3 py-1.5 text-xs italic text-ink-2"
                  style={{ border: '1px dashed var(--paper-edge)', borderRadius: 4 }}>
                  No input VAT posted yet — debit account 1300 (VAT Input Claimable) on supplier invoices to claim here.
                </div>
              )}
            </>
          )}
          {step === 2 && (
            <div className="card p-5 text-xs">
              <div className="text-sm font-medium mb-3">Adjustments</div>
              <p className="text-ink-2">No adjustments this period.</p>
            </div>
          )}
          {step === 3 && (
            <div className="card p-5 text-xs">
              <div className="text-sm font-medium mb-3">Review &amp; submit</div>
              <div className="space-y-2 mb-4">
                <Row label="Box 1 · Standard-rated supplies (excl)"  value={fmt(data.revenueExcl)} />
                <Row label="Box 13 · Total output tax"               value={fmt(data.outputVAT)} />
                <Row label="Box 20 · Total input tax"                value={fmt(data.inputVAT)} />
                <div className="flex justify-between font-semibold pt-2" style={{ borderTop: '1px solid var(--paper-edge)' }}>
                  <span>{data.netPayable >= 0 ? 'VAT payable to SARS' : 'VAT refund due'}</span>
                  <span className="num" style={{ color: data.netPayable >= 0 ? 'var(--negative)' : 'var(--positive)' }}>
                    R {fmt(Math.abs(data.netPayable))}
                  </span>
                </div>
              </div>
              <p className="text-ink-2 italic mb-3">
                Submit via eFiling at efiling.sars.gov.za using the amounts above.
              </p>
            </div>
          )}
        </div>

        {/* Sidebar summary */}
        <div className="w-56 shrink-0 card-accent p-4">
          <div className="text-xs font-medium mb-3">This return · {periodName}</div>
          <div className="space-y-1.5 mb-3 text-xs">
            <div className="flex justify-between">
              <span className="text-ink-2">Box 1 supplies (excl)</span>
              <span className="num">{loading ? '…' : fmt(data.revenueExcl)}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-ink-2">Box 13 output VAT</span>
              <span className="num">{loading ? '…' : fmt(data.outputVAT)}</span>
            </div>
            <div className="flex justify-between pb-2" style={{ borderBottom: '1px solid rgba(217,119,87,0.3)' }}>
              <span className="text-ink-2">Box 20 input VAT</span>
              <span className="num">{loading ? '…' : fmt(data.inputVAT)}</span>
            </div>
            <div className="flex justify-between items-baseline pt-1">
              <span className="font-medium">{data.netPayable >= 0 ? 'Payable' : 'Refund'}</span>
              <span className="num font-bold text-base text-accent">
                {loading ? '…' : `R ${fmt(Math.abs(data.netPayable))}`}
              </span>
            </div>
          </div>

          <div className="text-xs font-medium mb-1.5">Clears on submission</div>
          <div className="num space-y-0.5 text-ink-2" style={{ fontSize: 11 }}>
            <div>Dr 2100 VAT Output ..... {loading ? '…' : fmt(data.outputVAT)}</div>
            <div>Cr 1300 VAT Input ...... {loading ? '…' : fmt(data.inputVAT)}</div>
            <div>Cr 2200 SARS payable ... {loading ? '…' : fmt(data.netPayable)}</div>
          </div>
        </div>
      </div>
    </div>
  )
}

function VATBoxes({ title, boxes, totalLabel, totalVAT, loading }: {
  title: string
  boxes: { box: string; label: string; excl: number | null; vat: number | null }[]
  totalLabel: string
  totalVAT: number
  loading: boolean
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
            <th className="text-right w-32">Excl VAT</th>
            <th className="text-right w-28">VAT</th>
          </tr>
        </thead>
        <tbody>
          {boxes.map(b => (
            <tr key={b.box} className="t-row">
              <td className="t-cell num text-accent">{b.box}</td>
              <td className="t-cell">{b.label}</td>
              <td className="t-cell num">
                {loading && b.excl !== null ? <span className="h-3 w-20 inline-block rounded animate-pulse bg-paper-edge" /> : b.excl != null ? fmt(b.excl) : '—'}
              </td>
              <td className="t-cell num">
                {loading && b.vat !== null ? <span className="h-3 w-16 inline-block rounded animate-pulse bg-paper-edge" /> : b.vat != null ? fmt(b.vat) : '—'}
              </td>
            </tr>
          ))}
        </tbody>
        <tfoot>
          <tr style={{ background: 'var(--accent-soft)', borderTop: '2px solid var(--paper-edge)' }}>
            <td />
            <td className="px-3 py-2 text-xs font-semibold" colSpan={2}>{totalLabel}</td>
            <td className="px-3 py-2 num font-semibold">
              {loading ? '…' : fmt(totalVAT)}
            </td>
          </tr>
        </tfoot>
      </table>
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
