'use client'
import { useEffect, useState } from 'react'
import { formatMoney, monthName } from '@/lib/utils'
import Button from '@/components/ui/Button'
import PeriodSelector from '@/components/payroll/PeriodSelector'
import type { PrPeriod, PrEMP201 } from '@/lib/payroll/types'

export default function EMP201Page() {
  const [periods, setPeriods]   = useState<PrPeriod[]>([])
  const [periodId, setPeriodId] = useState<string>('')
  const [data, setData]         = useState<Partial<PrEMP201> | null>(null)
  const [payRef, setPayRef]     = useState('')
  const [submitting, setSubmitting] = useState(false)

  useEffect(() => {
    fetch('/api/payroll/periods')
      .then(r => r.json())
      .then((ps: PrPeriod[]) => {
        setPeriods(ps)
        const open = ps.find(p => p.status === 'approved' || p.status === 'calculated') ?? ps[0]
        if (open) setPeriodId(open.id)
      })
  }, [])

  useEffect(() => {
    if (!periodId) return
    fetch(`/api/payroll/emp201?period_id=${periodId}`)
      .then(r => r.json())
      .then(setData)
  }, [periodId])

  async function submit() {
    setSubmitting(true)
    const res = await fetch('/api/payroll/emp201', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ period_id: periodId, action: 'submit', payment_ref: payRef }),
    })
    if (res.ok) {
      const d = await fetch(`/api/payroll/emp201?period_id=${periodId}`)
      setData(await d.json())
    }
    setSubmitting(false)
  }

  const period = periods.find(p => p.id === periodId)
  const periodLabel = period ? `${monthName(period.month)} ${period.year}` : '—'
  const nextMonth = period
    ? period.month === 12
      ? `Jan ${period.year + 1}`
      : `${monthName(period.month + 1).slice(0, 3)} ${period.year}`
    : '—'
  const payRef2 = period ? `PAYE[your-ref] M${String(period.year).slice(2)}${String(period.month).padStart(2, '0')}` : ''

  return (
    <div>
      <div className="flex justify-between items-center mb-4">
        <div className="text-xs text-ink-2">
          {data?.status === 'submitted' ? `Filed ${data.submitted_at?.slice(0, 10)}` : `Due 7 ${nextMonth}`}
        </div>
        <PeriodSelector periods={periods} value={periodId} onChange={setPeriodId} />
      </div>

      <div className="grid gap-4" style={{ gridTemplateColumns: '1.3fr 1fr' }}>
        {/* Left: return summary */}
        <div className="card overflow-hidden">
          <div className="px-4 py-2.5 font-semibold text-sm bg-paper border-b border-paper-edge">
            EMP201 · {periodLabel} · return summary
          </div>
          <table className="w-full text-xs">
            <thead className="t-head">
              <tr>
                <th className="text-left font-medium w-16">Line</th>
                <th className="text-left font-medium">Description</th>
                <th className="text-right font-medium w-28">Amount</th>
              </tr>
            </thead>
            <tbody>
              {[
                { line: '1101', label: 'PAYE liability',                  amount: data?.paye_liability ?? 0,  tone: '' },
                { line: '1102', label: 'UIF liability (employee + employer)', amount: data?.uif_liability ?? 0, tone: '' },
                { line: '1103', label: 'SDL liability (1% of payroll)',   amount: data?.sdl_liability ?? 0,  tone: '' },
                { line: '1104', label: 'ETI credit claimed',              amount: -(data?.eti_claimed ?? 0), tone: 'soft' },
                { line: '—',   label: 'Total payable',                   amount: data?.total_payable ?? 0,  tone: 'total' },
              ].map((r, i) => (
                <tr
                  key={i}
                  className="border-b border-paper-edge"
                  style={{
                    fontWeight: r.tone === 'total' ? 700 : 400,
                    background: r.tone === 'total' ? 'var(--accent-soft)' : 'var(--surface)',
                    color: r.tone === 'soft' ? 'var(--accent)' : 'var(--ink)',
                  }}
                >
                  <td className="px-3 py-2 font-mono">{r.line}</td>
                  <td className="px-3 py-2">{r.label}</td>
                  <td className="px-3 py-2 num">{formatMoney(r.amount)}</td>
                </tr>
              ))}
            </tbody>
          </table>

          <div className="px-4 py-3 border-t border-paper-edge">
            <div className="text-xs font-semibold mb-2">Reconciliation · payroll → EMP201</div>
            <div className="font-mono text-xs text-ink-2" style={{ lineHeight: 1.8 }}>
              Sum of payslip PAYE .......... {formatMoney(data?.paye_liability ?? 0)} ✓{'\n'}
              Sum of payslip UIF (1%×2) ... {formatMoney(data?.uif_liability ?? 0)} ✓{'\n'}
              SDL (1% × gross payroll) .... {formatMoney(data?.sdl_liability ?? 0)} ✓
            </div>
          </div>
        </div>

        {/* Right: submission */}
        <div className="card-accent p-4">
          <div className="font-semibold mb-1">Submission</div>
          <div className="text-xs mb-3 text-ink-2">
            {data?.status === 'submitted'
              ? `Filed ${data.submitted_at?.slice(0, 10)} · ref ${data.payment_ref ?? '—'}`
              : 'File via SARS eFiling or download XML for manual upload.'
            }
          </div>

          {data?.status !== 'submitted' && (
            <>
              <Button size="sm" className="w-full justify-center mb-2" onClick={submit} disabled={submitting}>
                {submitting ? 'Submitting…' : 'Mark as submitted →'}
              </Button>
              <Button variant="secondary" size="sm" className="w-full justify-center">
                Download XML (manual upload)
              </Button>
            </>
          )}

          {data?.status === 'submitted' && (
            <div className="rounded px-3 py-2 text-xs bg-surface border border-paper-edge">
              ✓ Filed
            </div>
          )}

          <div className="mt-4 border-t pt-3" style={{ borderColor: 'rgba(217,119,87,0.3)' }}>
            <div className="font-semibold text-xs mb-2">Payment reference</div>
            <div className="font-mono text-xs p-2 rounded bg-surface border border-paper-edge" style={{ lineHeight: 1.8 }}>
              Beneficiary · SARS-PAYE{'\n'}
              Account .... 4055700729{'\n'}
              Branch ..... 632005 (Absa){'\n'}
              Reference .. {payRef2}
            </div>
            <div className="mt-2 text-xs text-muted italic">
              late submission → 10% penalty + interest at SARS rate
            </div>
          </div>

          <div className="mt-4">
            <label className="field-label">Payment reference (optional)</label>
            <input
              value={payRef}
              onChange={e => setPayRef(e.target.value)}
              placeholder={payRef2}
              className="field"
            />
          </div>
        </div>
      </div>
    </div>
  )
}
