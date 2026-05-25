'use client'
import { useEffect, useState } from 'react'
import MonthPicker, { type MonthValue } from '@/components/ui/MonthPicker'

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
function isoToday() { return new Date().toISOString().slice(0, 10) }

interface Vat201 {
  box1Excl: number; box2Excl: number; box3Excl: number; box4Vat: number; box11: number
  box12Excl: number; box14: number; box14A: number; box14AExcl: number
  box15Excl: number; box15AExcl: number; box16: number; box17: number; box18: number; box19: number
  box20: number; netPayable: number; entryCount: number
}
const ZeroData: Vat201 = {
  box1Excl: 0, box2Excl: 0, box3Excl: 0, box4Vat: 0, box11: 0,
  box12Excl: 0, box14: 0, box14A: 0, box14AExcl: 0,
  box15Excl: 0, box15AExcl: 0, box16: 0, box17: 0, box18: 0, box19: 0,
  box20: 0, netPayable: 0, entryCount: 0,
}

function fmt(n: number) { return n.toLocaleString('en-ZA', { minimumFractionDigits: 2 }) }
function dash(n: number) { return n === 0 ? '—' : fmt(n) }

const STEPS = ['1 Output VAT', '2 Input VAT', '3 Review & submit']

export default function VATPage() {
  const now = new Date()
  const defaultTo:   MonthValue = prevMonth({ year: now.getFullYear(), month: now.getMonth() })
  const defaultFrom: MonthValue = prevMonth(defaultTo)

  const [step,    setStep]    = useState(0)
  const [fromMth, setFromMth] = useState<MonthValue>(defaultFrom)
  const [toMth,   setToMth]   = useState<MonthValue>(defaultTo)
  const [data,    setData]    = useState<Vat201>(ZeroData)
  const [loading, setLoading] = useState(true)
  const [clearDate, setClearDate] = useState(isoToday())
  const [clearing, setClearing]   = useState(false)
  const [clearMsg, setClearMsg]   = useState<string | null>(null)
  const [clearErr, setClearErr]   = useState<string | null>(null)

  const from = monthStart(fromMth)
  const to   = monthEnd(toMth)

  useEffect(() => {
    setLoading(true)
    setClearMsg(null)
    setClearErr(null)
    fetch(`/api/vat201?from=${from}&to=${to}`)
      .then(r => r.json())
      .then(d => { setData(d.error ? ZeroData : d); setLoading(false) })
      .catch(() => setLoading(false))
  }, [from, to])

  const periodName = fromMth.month === toMth.month && fromMth.year === toMth.year
    ? `${MONTH_NAMES[fromMth.month]} ${fromMth.year}`
    : `${MONTH_NAMES[fromMth.month].slice(0, 3)} – ${MONTH_NAMES[toMth.month].slice(0, 3)} ${toMth.year}`

  const periodCode = `${fromMth.year}${String(fromMth.month + 1).padStart(2, '0')}`
  const dueDate    = new Date(toMth.year, toMth.month + 2, 25)
  const dueDateStr = `${dueDate.getDate()} ${MONTH_NAMES[dueDate.getMonth()].slice(0, 3)}`

  async function postClearing() {
    setClearing(true)
    setClearMsg(null)
    setClearErr(null)
    try {
      const res = await fetch('/api/vat-clearing', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ from, to, clearing_date: clearDate }),
      })
      const d = await res.json()
      if (!res.ok) setClearErr(d.error ?? 'VAT clearing failed')
      else setClearMsg(`Cleared — entry ${d.reference}. Output R ${fmt(d.output_vat)}, Input R ${fmt(d.input_vat)}, Net payable R ${fmt(d.net_payable)}.`)
    } catch (e: unknown) {
      setClearErr(e instanceof Error ? e.message : String(e))
    } finally {
      setClearing(false)
    }
  }

  return (
    <div className="p-5 max-w-4xl">
      <div className="flex items-start justify-between mb-1">
        <div>
          <h1 className="text-xl font-semibold">VAT 201 · SARS submission</h1>
          <p className="text-xs mt-0.5 text-ink-2">
            Period {periodCode} · {data.entryCount} entries · SARS eFiling reference
          </p>
        </div>
        <div className="flex gap-2 items-center flex-wrap justify-end">
          <div className="flex items-center gap-1 text-xs text-ink-2">
            <span>From</span>
            <MonthPicker value={fromMth} onChange={setFromMth} />
            <span>To</span>
            <MonthPicker value={toMth} onChange={setToMth} />
          </div>
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
            <div className="card overflow-hidden">
              <div className="px-4 py-2.5 text-xs font-medium italic bg-paper border-b border-paper-edge">
                Part I — Output VAT (sales &amp; deemed supplies)
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
                  <BoxRow box="1"  label="Standard-rated supplies (15%)"  excl={data.box1Excl}  vat={data.box11 - data.box4Vat} loading={loading} />
                  <BoxRow box="2"  label="Zero-rated supplies"             excl={data.box2Excl}  vat={null}                      loading={loading} />
                  <BoxRow box="3"  label="Exempt supplies"                 excl={data.box3Excl}  vat={null}                      loading={loading} />
                  <BoxRow box="4"  label="Goods / services for own use"   excl={null}           vat={data.box4Vat}              loading={loading} />
                  <BoxRow box="5"  label="Exports"                         excl={null}           vat={null}                      loading={loading} />
                </tbody>
                <tfoot>
                  <tr style={{ background: 'var(--accent-soft)', borderTop: '2px solid var(--paper-edge)' }}>
                    <td className="px-3 py-2 text-xs font-semibold text-accent">11</td>
                    <td className="px-3 py-2 text-xs font-semibold" colSpan={2}>Total output tax</td>
                    <td className="px-3 py-2 num font-semibold">{loading ? '…' : fmt(data.box11)}</td>
                  </tr>
                </tfoot>
              </table>
            </div>
          )}

          {step === 1 && (
            <div className="card overflow-hidden">
              <div className="px-4 py-2.5 text-xs font-medium italic bg-paper border-b border-paper-edge">
                Part II — Input VAT (purchases &amp; claims)
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
                  <BoxRow box="12"  label="Standard-rated acquisitions (15%)" excl={data.box12Excl}  vat={null}       loading={loading} />
                  <BoxRow box="13"  label="Zero-rated acquisitions"            excl={data.box15Excl}  vat={null}       loading={loading} />
                  <BoxRow box="14"  label="Input VAT — general (15%)"          excl={null}            vat={data.box14} loading={loading} />
                  <BoxRow box="14A" label="Input VAT — capital goods (15%)"    excl={data.box14AExcl} vat={data.box14A} loading={loading} />
                  <BoxRow box="15"  label="Zero-rated acquisitions"            excl={data.box15Excl}  vat={null}       loading={loading} />
                  <BoxRow box="15A" label="Exempt acquisitions"                excl={data.box15AExcl} vat={null}       loading={loading} />
                  <BoxRow box="16"  label="Imports — SAD 500"                  excl={null}            vat={data.box16 || null} loading={loading} />
                  <BoxRow box="17"  label="Change in use"                      excl={null}            vat={data.box17 || null} loading={loading} />
                  <BoxRow box="18"  label="Bad debts"                          excl={null}            vat={data.box18 || null} loading={loading} />
                  <BoxRow box="19"  label="Other adjustments"                  excl={null}            vat={data.box19 || null} loading={loading} />
                </tbody>
                <tfoot>
                  <tr style={{ background: 'var(--accent-soft)', borderTop: '2px solid var(--paper-edge)' }}>
                    <td className="px-3 py-2 text-xs font-semibold text-accent">20</td>
                    <td className="px-3 py-2 text-xs font-semibold" colSpan={2}>Total input tax</td>
                    <td className="px-3 py-2 num font-semibold">{loading ? '…' : fmt(data.box20)}</td>
                  </tr>
                </tfoot>
              </table>
              {data.box20 === 0 && !loading && (
                <div className="px-4 pb-3 text-xs italic text-ink-2">
                  No input VAT — debit 1300 (VAT Input Claimable) on supplier bills to claim here.
                </div>
              )}
            </div>
          )}

          {step === 2 && (
            <div className="card p-5 text-xs space-y-2">
              <div className="text-sm font-medium mb-3">Review &amp; submit</div>
              <Row label="Box 1  Standard-rated supplies (excl)" value={dash(data.box1Excl)} />
              {data.box2Excl > 0 && <Row label="Box 2  Zero-rated supplies (excl)"  value={fmt(data.box2Excl)} />}
              {data.box3Excl > 0 && <Row label="Box 3  Exempt supplies (excl)"       value={fmt(data.box3Excl)} />}
              <Row label="Box 11 Total output tax"                value={fmt(data.box11)} />
              <div style={{ borderTop: '1px dashed var(--paper-edge)', margin: '8px 0' }} />
              <Row label="Box 14 Input VAT (general)"            value={dash(data.box14)} />
              {data.box14A > 0 && <Row label="Box 14A Input VAT (capital goods)"    value={fmt(data.box14A)} />}
              <Row label="Box 20 Total input tax"                value={dash(data.box20)} />
              <div className="flex justify-between font-semibold pt-2" style={{ borderTop: '2px solid var(--paper-edge)' }}>
                <span>{data.netPayable >= 0 ? 'VAT payable to SARS' : 'VAT refund due'}</span>
                <span className="num" style={{ color: data.netPayable >= 0 ? 'var(--negative)' : 'var(--positive)' }}>
                  R {fmt(Math.abs(data.netPayable))}
                </span>
              </div>
              <p className="text-ink-2 italic pt-2">
                Submit via eFiling at efiling.sars.gov.za using the amounts above.
              </p>

              {/* V-06: VAT clearing journal */}
              <div className="mt-4 pt-4" style={{ borderTop: '1px solid var(--paper-edge)' }}>
                <div className="font-medium mb-2">Post VAT clearing journal</div>
                <p className="text-ink-2 mb-3">
                  Dr 2100 VAT Output · Cr 1300 VAT Input · Cr 2110 SARS VAT Payable
                </p>
                {clearMsg && (
                  <div className="mb-2 px-3 py-1.5 rounded text-xs"
                    style={{ background: 'var(--positive-soft, #dcfce7)', color: 'var(--positive, #16a34a)', border: '1px solid var(--positive)' }}>
                    {clearMsg}
                  </div>
                )}
                {clearErr && (
                  <div className="mb-2 px-3 py-1.5 rounded text-xs"
                    style={{ background: 'var(--accent-soft)', color: 'var(--negative)', border: '1px solid var(--negative)' }}>
                    {clearErr}
                  </div>
                )}
                <div className="flex items-end gap-3">
                  <div>
                    <label className="text-ink-2 block mb-1">Clearing date</label>
                    <input
                      type="date"
                      value={clearDate}
                      onChange={e => setClearDate(e.target.value)}
                      className="input text-xs py-1 px-2"
                    />
                  </div>
                  <button
                    className="btn btn-secondary text-xs"
                    disabled={clearing || data.box11 === 0}
                    onClick={() => {
                      if (!confirm(`Post VAT clearing entry for ${periodName}?\n\nDr 2100 R ${fmt(data.box11)}\nCr 1300 R ${fmt(data.box20)}\nCr 2110 R ${fmt(data.netPayable)}`)) return
                      postClearing()
                    }}
                  >
                    {clearing ? 'Posting…' : 'Post clearing entry'}
                  </button>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Sidebar */}
        <div className="w-56 shrink-0 card-accent p-4">
          <div className="text-xs font-medium mb-3">This return · {periodName}</div>
          <div className="space-y-1.5 mb-3 text-xs">
            <SideRow label="Box 1 supplies (excl)"  value={loading ? '…' : dash(data.box1Excl)} />
            {data.box2Excl > 0 && <SideRow label="Box 2 zero-rated (excl)"  value={fmt(data.box2Excl)} />}
            {data.box3Excl > 0 && <SideRow label="Box 3 exempt (excl)"      value={fmt(data.box3Excl)} />}
            <SideRow label="Box 11 output VAT"      value={loading ? '…' : fmt(data.box11)} />
            <div style={{ borderBottom: '1px solid rgba(217,119,87,0.3)', paddingBottom: 4 }} />
            <SideRow label="Box 14 input VAT"       value={loading ? '…' : dash(data.box14)} />
            {data.box14A > 0 && <SideRow label="Box 14A capital"            value={fmt(data.box14A)} />}
            <SideRow label="Box 20 total input"     value={loading ? '…' : dash(data.box20)} />
            <div className="flex justify-between items-baseline pt-1">
              <span className="font-medium">{data.netPayable >= 0 ? 'Payable' : 'Refund'}</span>
              <span className="num font-bold text-base text-accent">
                {loading ? '…' : `R ${fmt(Math.abs(data.netPayable))}`}
              </span>
            </div>
          </div>

          <div className="text-xs font-medium mb-1.5">Clearing entry</div>
          <div className="num space-y-0.5 text-ink-2" style={{ fontSize: 11 }}>
            <div>Dr 2100 .... {loading ? '…' : fmt(data.box11)}</div>
            <div>Cr 1300 .... {loading ? '…' : fmt(data.box20)}</div>
            <div>Cr 2110 .... {loading ? '…' : fmt(data.netPayable)}</div>
          </div>
        </div>
      </div>
    </div>
  )
}

function BoxRow({ box, label, excl, vat, loading }: {
  box: string; label: string; excl: number | null; vat: number | null; loading: boolean
}) {
  return (
    <tr className="t-row">
      <td className="t-cell num text-accent">{box}</td>
      <td className="t-cell">{label}</td>
      <td className="t-cell num">
        {loading && excl !== null
          ? <span className="h-3 w-20 inline-block rounded animate-pulse bg-paper-edge" />
          : excl != null ? dash(excl) : '—'}
      </td>
      <td className="t-cell num">
        {loading && vat !== null
          ? <span className="h-3 w-16 inline-block rounded animate-pulse bg-paper-edge" />
          : vat != null ? dash(vat) : '—'}
      </td>
    </tr>
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

function SideRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex justify-between">
      <span className="text-ink-2">{label}</span>
      <span className="num">{value}</span>
    </div>
  )
}
