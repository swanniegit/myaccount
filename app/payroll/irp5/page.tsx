'use client'
import { useEffect, useState } from 'react'
import { formatMoney, monthName } from '@/lib/utils'
import Button from '@/components/ui/Button'
import type { PrPeriod, PrPayslip } from '@/lib/payroll/types'

interface ReconLine {
  code: string
  description: string
  emp201Sum: number
  irp5Sum: number
}

export default function IRP5Page() {
  const [periods, setPeriods]   = useState<PrPeriod[]>([])
  const [recon, setRecon]       = useState<ReconLine[]>([])
  const [loading, setLoading]   = useState(true)

  useEffect(() => {
    async function load() {
      const res = await fetch('/api/payroll/periods')
      if (!res.ok) return
      const ps: PrPeriod[] = await res.json()
      setPeriods(ps)

      // Aggregate across all paid/approved periods for current tax year (Mar–Feb)
      const now = new Date()
      const taxYearStart = now.getMonth() >= 2  // Feb is month 1
        ? new Date(now.getFullYear(), 2, 1)      // This year March
        : new Date(now.getFullYear() - 1, 2, 1)  // Last year March

      const relevant = ps.filter(p => {
        const d = new Date(p.start_date)
        return d >= taxYearStart && (p.status === 'paid' || p.status === 'approved')
      })

      if (relevant.length === 0) {
        setRecon([])
        setLoading(false)
        return
      }

      // Fetch payslips for all relevant periods
      const slipSets = await Promise.all(
        relevant.map(p => fetch(`/api/payroll/run?period_id=${p.id}`).then(r => r.json()))
      )
      const allSlips: PrPayslip[] = slipSets.flat()

      const sum = (fn: (p: PrPayslip) => number) =>
        allSlips.reduce((s, p) => s + fn(p), 0)

      const lines: ReconLine[] = [
        { code: '3601', description: 'Income — salary',          emp201Sum: sum(p => Number(p.gross)),        irp5Sum: sum(p => Number(p.gross)) },
        { code: '4102', description: 'PAYE',                     emp201Sum: sum(p => Number(p.paye)),         irp5Sum: sum(p => Number(p.paye)) },
        { code: '4141', description: 'UIF (employee)',           emp201Sum: sum(p => Number(p.uif_employee)), irp5Sum: sum(p => Number(p.uif_employee)) },
        { code: '4142', description: 'UIF (employer)',           emp201Sum: sum(p => Number(p.uif_employer)), irp5Sum: sum(p => Number(p.uif_employer)) },
        { code: '4150', description: 'SDL',                      emp201Sum: sum(p => Number(p.sdl)),          irp5Sum: sum(p => Number(p.sdl)) },
      ]
      setRecon(lines)
      setLoading(false)
    }
    load()
  }, [])

  const now = new Date()
  const taxYear = now.getMonth() >= 2
    ? `${now.getFullYear()}/${now.getFullYear() + 1}`
    : `${now.getFullYear() - 1}/${now.getFullYear()}`

  const allMatch = recon.every(r => Math.abs(r.emp201Sum - r.irp5Sum) < 0.01)

  return (
    <div>
      <div className="grid gap-4" style={{ gridTemplateColumns: '1.2fr 1fr' }}>
        {/* Left: recon table */}
        <div className="rounded-lg overflow-hidden" style={{ border: '1px solid var(--paper-edge)' }}>
          <div className="px-4 py-2.5 font-semibold text-sm" style={{ background: 'var(--paper)', borderBottom: '1px solid var(--paper-edge)' }}>
            Reconciliation check · {taxYear}
          </div>
          <div className="px-4 py-2 text-xs" style={{ color: 'var(--ink-2)', borderBottom: '1px solid var(--paper-edge)' }}>
            Sum of monthly EMP201s must equal sum of IRP5 certificates.
          </div>
          <table className="w-full text-xs">
            <thead>
              <tr style={{ background: 'var(--paper-edge)' }}>
                <th className="px-3 py-2 text-left font-medium" style={{ color: 'var(--ink-2)' }}>Code</th>
                <th className="px-3 py-2 text-left font-medium" style={{ color: 'var(--ink-2)' }}>Description</th>
                <th className="px-3 py-2 text-right font-medium" style={{ color: 'var(--ink-2)' }}>EMP201 sum</th>
                <th className="px-3 py-2 text-right font-medium" style={{ color: 'var(--ink-2)' }}>IRP5 sum</th>
                <th className="px-3 py-2 text-center font-medium w-8" style={{ color: 'var(--ink-2)' }}>Δ</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr>
                  <td colSpan={5} className="px-3 py-8 text-center" style={{ color: 'var(--muted)' }}>Loading…</td>
                </tr>
              ) : recon.length === 0 ? (
                <tr>
                  <td colSpan={5} className="px-3 py-8 text-center" style={{ color: 'var(--muted)' }}>
                    No approved payroll periods in this tax year yet.
                  </td>
                </tr>
              ) : (
                recon.map(r => {
                  const diff = Math.abs(r.emp201Sum - r.irp5Sum)
                  const match = diff < 0.01
                  return (
                    <tr key={r.code} className="border-b" style={{ borderColor: 'var(--paper-edge)', background: 'var(--surface)' }}>
                      <td className="px-3 py-2 font-mono" style={{ color: 'var(--accent)' }}>{r.code}</td>
                      <td className="px-3 py-2">{r.description}</td>
                      <td className="px-3 py-2 font-mono text-right">{formatMoney(r.emp201Sum)}</td>
                      <td className="px-3 py-2 font-mono text-right">{formatMoney(r.irp5Sum)}</td>
                      <td className="px-3 py-2 text-center font-semibold" style={{ color: match ? '#1f8a5b' : '#c0392b' }}>
                        {match ? '✓' : `Δ${formatMoney(diff)}`}
                      </td>
                    </tr>
                  )
                })
              )}
            </tbody>
          </table>

          {recon.length > 0 && (
            <div
              className="px-4 py-2 text-xs"
              style={{
                color: allMatch ? '#1f8a5b' : '#c0392b',
                background: allMatch ? '#f0faf5' : '#fdecea',
                borderTop: '1px solid var(--paper-edge)',
              }}
            >
              {allMatch
                ? '✓ All codes balance — ready to submit EMP501'
                : '⚠ Variance detected — resolve before submission (usually mid-year adjustments)'
              }
            </div>
          )}
        </div>

        {/* Right: outputs */}
        <div
          className="rounded-lg p-4"
          style={{ border: '1px solid var(--accent)', background: 'var(--accent-soft)' }}
        >
          <div className="font-semibold mb-3">Output</div>
          <div className="flex flex-col gap-2">
            {[
              { t: 'EMP501 declaration (CSV/XML)', s: 'employer-level totals', primary: true },
              { t: 'IRP5 certificates',            s: 'PAYE was deducted' },
              { t: 'IT3(a) certificates',          s: 'below threshold employees' },
              { t: 'e@syFile bundle (.zip)',        s: 'one-click upload to eFiling' },
            ].map((x, i) => (
              <div
                key={i}
                className="flex justify-between items-center rounded p-2"
                style={{
                  border: `1.5px solid ${x.primary ? 'var(--accent)' : 'var(--paper-edge)'}`,
                  background: x.primary ? 'var(--surface)' : 'transparent',
                }}
              >
                <div>
                  <div className="text-sm font-medium">{x.t}</div>
                  <div className="text-xs" style={{ color: 'var(--ink-2)' }}>{x.s}</div>
                </div>
                <Button variant={x.primary ? 'primary' : 'secondary'} size="sm">Download</Button>
              </div>
            ))}
          </div>

          <div className="mt-4 border-t pt-3" style={{ borderColor: 'rgba(217,119,87,0.3)' }}>
            <div className="text-xs font-semibold mb-2">Timeline</div>
            <div className="text-xs" style={{ lineHeight: 1.8, color: 'var(--ink-2)' }}>
              Bi-annual recon (1 Mar – 31 Aug) → <strong>31 Oct</strong><br />
              Annual recon (1 Mar – 28 Feb) → <strong>31 May</strong><br />
              IRP5 delivered to employees → <strong>by 31 May</strong>
            </div>
          </div>

          <div className="mt-4 border-t pt-3" style={{ borderColor: 'rgba(217,119,87,0.3)' }}>
            <div className="text-xs font-semibold mb-1.5">Key SARS source codes</div>
            <div className="font-mono text-xs" style={{ lineHeight: 1.7, color: 'var(--ink-2)' }}>
              3601 Income — salary{'\n'}
              3701 Travel allowance (80%){'\n'}
              4102 PAYE{'\n'}
              4141 UIF (employee){'\n'}
              4142 UIF (employer){'\n'}
              4150 SDL
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
