'use client'
import { useEffect, useState } from 'react'
import { formatMoney, monthName } from '@/lib/utils'
import Button from '@/components/ui/Button'
import PeriodSelector from '@/components/payroll/PeriodSelector'
import type { PrPeriod, PrPayslip, PrPayslipLine } from '@/lib/payroll/types'

type PayslipWithEmployee = PrPayslip & {
  employee: { full_name: string; code: string; job_title: string | null }
  lines: PrPayslipLine[]
}

export default function RunPayrollPage() {
  const [periods, setPeriods]     = useState<PrPeriod[]>([])
  const [periodId, setPeriodId]   = useState<string>('')
  const [payslips, setPayslips]   = useState<PayslipWithEmployee[]>([])
  const [selected, setSelected]   = useState<PayslipWithEmployee | null>(null)
  const [step, setStep]           = useState(0) // 0=inputs, 1=calculate, 2=review, 3=pay
  const [loading, setLoading]     = useState(false)
  const [running, setRunning]     = useState(false)
  const [posting, setPosting]     = useState(false)
  const [glPosted, setGlPosted]   = useState(false)
  const [glError, setGlError]     = useState<string | null>(null)

  useEffect(() => {
    fetch('/api/payroll/periods')
      .then(r => r.json())
      .then((ps: PrPeriod[]) => {
        setPeriods(ps)
        const open = ps.find(p => p.status !== 'paid')
        if (open) {
          setPeriodId(open.id)
          const s = open.status === 'open' ? 0 : open.status === 'calculated' ? 2 : open.status === 'approved' ? 3 : 2
          setStep(s)
        }
      })
  }, [])

  useEffect(() => {
    if (!periodId) return
    setLoading(true)
    fetch(`/api/payroll/run?period_id=${periodId}`)
      .then(r => r.json())
      .then((ps: PayslipWithEmployee[]) => {
        setPayslips(ps)
        if (ps.length > 0) setSelected(ps[0])
      })
      .finally(() => setLoading(false))
  }, [periodId])

  async function calculate() {
    setRunning(true)
    const res = await fetch('/api/payroll/run', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ period_id: periodId }),
    })
    if (res.ok) {
      setStep(2)
      const fresh = await fetch(`/api/payroll/run?period_id=${periodId}`)
      if (fresh.ok) {
        const ps = await fresh.json()
        setPayslips(ps)
        if (ps.length > 0) setSelected(ps[0])
      }
    }
    setRunning(false)
  }

  async function approveAll() {
    setRunning(true)
    await fetch('/api/payroll/run', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ period_id: periodId, action: 'approve' }),
    })
    setStep(3)
    setRunning(false)
  }

  async function postToGL() {
    setPosting(true)
    setGlError(null)
    const res = await fetch('/api/payroll/close', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ period_id: periodId }),
    })
    if (res.ok) {
      setGlPosted(true)
    } else {
      const body = await res.json()
      setGlError(body.error ?? 'Failed to post to GL')
    }
    setPosting(false)
  }

  const period = periods.find(p => p.id === periodId)
  const periodLabel = period ? `${monthName(period.month)} ${period.year}` : '—'

  const STEPS = ['1. Inputs', '2. Calculate', '3. Review', '4. Pay & file']

  return (
    <div>
      {/* Stepper */}
      <div className="flex items-center gap-2 mb-5">
        {STEPS.map((s, i) => (
          <div key={i} className="flex items-center gap-2">
            <div
              className="px-3 py-1 text-xs rounded font-medium"
              style={{
                background: step >= i ? 'var(--ink)' : 'transparent',
                color: step >= i ? '#fff' : 'var(--ink-2)',
                border: `1.5px solid ${step >= i ? 'var(--ink)' : 'var(--paper-edge)'}`,
              }}
            >
              {s}
            </div>
            {i < 3 && (
              <div
                className="w-6 h-px"
                style={{ borderTop: `1.5px ${i < step ? 'solid' : 'dashed'} var(--ink)` }}
              />
            )}
          </div>
        ))}
        <div className="flex-1" />
        <PeriodSelector periods={periods} value={periodId} onChange={setPeriodId} />
      </div>

      {step === 0 && (
        <div className="card p-6 text-center">
          <div className="text-sm font-semibold mb-2">{periodLabel} · ready to calculate</div>
          <div className="text-xs mb-4 text-ink-2">
            All employees will have PAYE, UIF and SDL calculated using SARS 2025/26 tax tables.
          </div>
          <Button onClick={calculate} disabled={running}>
            {running ? 'Calculating…' : `Calculate ${periodLabel} →`}
          </Button>
        </div>
      )}

      {(step === 1 || step === 2) && (
        <div className="grid gap-4" style={{ gridTemplateColumns: '1.5fr 1fr' }}>
          {/* Left: payslip detail */}
          <div className="card p-4">
            {/* Employee nav */}
            <div className="flex justify-between items-baseline mb-3">
              <span className="font-semibold">
                {selected?.employee?.full_name ?? '—'}
                {selected?.employee?.job_title && (
                  <span className="font-normal text-xs ml-2 text-ink-2">
                    · {selected.employee.job_title}
                  </span>
                )}
              </span>
              <div className="flex gap-1 text-xs">
                {payslips.map((p, i) => (
                  <button
                    key={p.id}
                    onClick={() => setSelected(p)}
                    className="w-6 h-6 rounded text-center"
                    style={{
                      background: selected?.id === p.id ? 'var(--ink)' : 'var(--paper-edge)',
                      color: selected?.id === p.id ? '#fff' : 'var(--ink-2)',
                    }}
                  >
                    {i + 1}
                  </button>
                ))}
              </div>
            </div>

            {selected && (
              <>
                <div className="grid grid-cols-2 gap-4 mb-3">
                  <div>
                    <div className="text-xs font-medium mb-1.5 text-ink-2">Earnings</div>
                    {(selected.lines ?? [])
                      .filter(l => l.type === 'earning')
                      .map(l => (
                        <div key={l.id} className="flex justify-between py-1 border-b border-paper-edge text-xs">
                          <span>{l.description}</span>
                          <span className="font-mono">{formatMoney(Number(l.amount))}</span>
                        </div>
                      ))}
                    <div className="flex justify-between py-1.5 text-xs font-semibold mt-1">
                      <span>Gross</span>
                      <span className="font-mono">{formatMoney(Number(selected.gross))}</span>
                    </div>
                  </div>
                  <div>
                    <div className="text-xs font-medium mb-1.5 text-ink-2">Deductions</div>
                    {(selected.lines ?? [])
                      .filter(l => l.type === 'deduction')
                      .map(l => (
                        <div key={l.id} className="flex justify-between py-1 border-b border-paper-edge text-xs">
                          <span>{l.description}</span>
                          <span className="font-mono">{formatMoney(Number(l.amount))}</span>
                        </div>
                      ))}
                    <div className="flex justify-between py-1.5 text-xs font-semibold mt-1">
                      <span>Total deductions</span>
                      <span className="font-mono">{formatMoney(Number(selected.total_deductions))}</span>
                    </div>
                  </div>
                </div>

                <div className="flex justify-between items-baseline border-t border-ink pt-3">
                  <span className="font-semibold">Net pay</span>
                  <span className="text-xl font-mono font-bold text-accent">
                    {formatMoney(Number(selected.net))}
                  </span>
                </div>
              </>
            )}
          </div>

          {/* Right: PAYE workings */}
          <div className="card-accent p-4">
            <div className="font-semibold mb-2">PAYE workings</div>
            <div className="text-xs mb-3 text-ink-2">SARS 2025/26 · monthly equivalent</div>
            <div
              className="font-mono text-xs p-3 rounded bg-surface border border-paper-edge"
              style={{ lineHeight: 1.8, whiteSpace: 'pre-wrap' }}
            >
              PAYE ......... {formatMoney(Number(selected?.paye ?? 0))}{'\n'}
              UIF emp ...... {formatMoney(Number(selected?.uif_employee ?? 0))}{'\n'}
              UIF er ....... {formatMoney(Number(selected?.uif_employer ?? 0))}{'\n'}
              SDL .......... {formatMoney(Number(selected?.sdl ?? 0))}{'\n'}
              ETI .......... {formatMoney(Number(selected?.eti_claimed ?? 0))}
            </div>

            <div className="mt-4 border-t pt-3" style={{ borderColor: 'rgba(217,119,87,0.3)' }}>
              <div className="text-xs font-semibold mb-2">Will post to GL</div>
              {selected && (
                <div className="font-mono text-xs text-ink-2" style={{ lineHeight: 1.7 }}>
                  Dr 5100 Salaries ......... {formatMoney(Number(selected.gross) + Number(selected.uif_employer) + Number(selected.sdl))}{'\n'}
                  {'  '}Cr 2200 PAYE ......... {formatMoney(Number(selected.paye))}{'\n'}
                  {'  '}Cr 2210 UIF .......... {formatMoney(Number(selected.uif_employee) + Number(selected.uif_employer))}{'\n'}
                  {Number(selected.sdl) > 0
                    ? `  Cr 2220 SDL .......... ${formatMoney(Number(selected.sdl))}\n`
                    : ''
                  }{'  '}Cr 1010 Bank ......... {formatMoney(Number(selected.net))}
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Action buttons */}
      {step === 2 && (
        <div className="flex justify-between mt-4">
          <Button variant="ghost" size="sm" onClick={() => setStep(0)}>← Back · Inputs</Button>
          <div className="flex gap-2">
            <Button variant="secondary" size="sm">Download payslips</Button>
            <Button size="sm" onClick={approveAll} disabled={running}>
              {running ? 'Approving…' : 'Approve all & file →'}
            </Button>
          </div>
        </div>
      )}

      {step === 3 && (
        <div className="card-accent p-4 mt-4">
          <div className="text-sm font-semibold mb-1 text-center">{periodLabel} · approved ✓</div>
          <div className="text-xs mb-3 text-ink-2 text-center">
            Post the payroll journal to the General Ledger, then generate the EFT batch and file EMP201.
          </div>
          {glError && (
            <div className="text-xs px-3 py-2 rounded mb-3 text-negative" style={{ background: 'rgba(220,50,50,0.06)', border: '1px solid var(--negative)' }}>
              {glError}
            </div>
          )}
          {glPosted && (
            <div className="text-xs px-3 py-2 rounded mb-3 text-positive text-center" style={{ border: '1px dashed var(--positive)' }}>
              ✓ Posted to GL
            </div>
          )}
          <div className="flex gap-2 justify-center">
            <Button
              size="sm"
              onClick={postToGL}
              disabled={posting || glPosted}
            >
              {posting ? 'Posting…' : glPosted ? 'Posted to GL ✓' : 'Post to GL'}
            </Button>
            <Button variant="secondary" size="sm">Download EFT batch</Button>
            <Button size="sm" onClick={() => { window.location.href = '/payroll/emp201' }}>
              File EMP201 →
            </Button>
          </div>
        </div>
      )}

      {loading && (
        <div className="mt-4 text-xs text-center text-muted">Loading payslips…</div>
      )}
    </div>
  )
}
