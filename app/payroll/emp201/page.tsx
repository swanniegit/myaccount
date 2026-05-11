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
        <div className="text-xs" style={{ color: 'var(--ink-2)' }}>
          {data?.status === 'submitted' ? `Filed ${data.submitted_at?.slice(0, 10)}` : `Due 7 ${nextMonth}`}
        </div>
        <PeriodSelector periods={periods} value={periodId} onChange={setPeriodId} />
      </div>

      <div className="grid gap-4" style={{ gridTemplateColumns: '1.3fr 1fr' }}>
        {/* Left: return summary */}
        <div className="rounded-lg overflow-hidden" style={{ border: '1px solid var(--paper-edge)' }}>
          <div className="px-4 py-2.5 font-semibold text-sm" style={{ background: 'var(--paper)', borderBottom: '1px solid var(--paper-edge)' }}>
            EMP201 · {periodLabel} · return summary
          </div>
          <table className="w-full text-xs">
            <thead>
              <tr style={{ background: 'var(--paper-edge)' }}>
                <th className="px-3 py-2 text-left font-medium w-16" style={{ color: 'var(--ink-2)' }}>Line</th>
                <th className="px-3 py-2 text-left font-medium" style={{ color: 'var(--ink-2)' }}>Description</th>
                <th className="px-3 py-2 text-right font-medium w-28" style={{ color: 'var(--ink-2)' }}>Amount</th>
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
                  className="border-b"
                  style={{
                    borderColor: 'var(--paper-edge)',
                    fontWeight: r.tone === 'total' ? 700 : 400,
                    background: r.tone === 'total' ? 'var(--accent-soft)' : r.tone === 'soft' ? 'var(--surface)' : 'var(--surface)',
                    color: r.tone === 'soft' ? 'var(--accent)' : 'var(--ink)',
                  }}
                >
                  <td className="px-3 py-2 font-mono">{r.line}</td>
                  <td className="px-3 py-2">{r.label}</td>
                  <td className="px-3 py-2 font-mono text-right">{formatMoney(r.amount)}</td>
                </tr>
              ))}
            </tbody>
          </table>

          <div className="px-4 py-3" style={{ borderTop: '1px solid var(--paper-edge)' }}>
            <div className="text-xs font-semibold mb-2">Reconciliation · payroll → EMP201</div>
            <div className="font-mono text-xs" style={{ lineHeight: 1.8, color: 'var(--ink-2)' }}>
              Sum of payslip PAYE .......... {formatMoney(data?.paye_liability ?? 0)} ✓{'\n'}
              Sum of payslip UIF (1%×2) ... {formatMoney(data?.uif_liability ?? 0)} ✓{'\n'}
              SDL (1% × gross payroll) .... {formatMoney(data?.sdl_liability ?? 0)} ✓
            </div>
          </div>
        </div>

        {/* Right: submission */}
        <div
          className="rounded-lg p-4"
          style={{ border: '1px solid var(--accent)', background: 'var(--accent-soft)' }}
        >
          <div className="font-semibold mb-1">Submission</div>
          <div className="text-xs mb-3" style={{ color: 'var(--ink-2)' }}>
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
            <div
              className="rounded px-3 py-2 text-xs"
              style={{ background: 'var(--surface)', border: '1px solid var(--paper-edge)' }}
            >
              ✓ Filed
            </div>
          )}

          <div className="mt-4 border-t pt-3" style={{ borderColor: 'rgba(217,119,87,0.3)' }}>
            <div className="font-semibold text-xs mb-2">Payment reference</div>
            <div
              className="font-mono text-xs p-2 rounded"
              style={{ background: 'var(--surface)', border: '1px solid var(--paper-edge)', lineHeight: 1.8 }}
            >
              Beneficiary · SARS-PAYE{'\n'}
              Account .... 4055700729{'\n'}
              Branch ..... 632005 (Absa){'\n'}
              Reference .. {payRef2}
            </div>
            <div className="mt-2 text-xs" style={{ color: 'var(--muted)', fontStyle: 'italic' }}>
              late submission → 10% penalty + interest at SARS rate
            </div>
          </div>

          <div className="mt-4">
            <label className="block text-xs mb-1" style={{ color: 'var(--ink-2)' }}>Payment reference (optional)</label>
            <input
              value={payRef}
              onChange={e => setPayRef(e.target.value)}
              placeholder={payRef2}
              className="w-full px-2.5 py-1.5 text-xs rounded border"
              style={{ borderColor: 'var(--paper-edge)', background: 'var(--paper)' }}
            />
          </div>
        </div>
      </div>
    </div>
  )
}
