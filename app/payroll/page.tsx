'use client'
import { useEffect, useState } from 'react'
import Link from 'next/link'
import { formatMoney, monthName } from '@/lib/utils'
import type { PrPeriod, PrPayslip, PrEMP201 } from '@/lib/payroll/types'

interface DashData {
  period: PrPeriod | null
  payslips: PrPayslip[]
  emp201: PrEMP201 | null
}

const STEPS = [
  { n: 1, title: 'Inputs',          sub: 'basic salary · allowances',      href: '/payroll/employees' },
  { n: 2, title: 'Calculate',       sub: 'PAYE · UIF · SDL',               href: '/payroll/run' },
  { n: 3, title: 'Review payslips', sub: 'approve each employee',          href: '/payroll/run' },
  { n: 4, title: 'Pay & file',      sub: 'EFT batch + EMP201',             href: '/payroll/emp201' },
]

const NEEDS_YOU = [
  { t: 'EMP501 mid-year recon',    s: 'due 31 Oct',                       tone: 'soft' },
  { t: 'COIDA letter of standing', s: 'renew annually by 31 Mar',         tone: 'warn' },
]

export default function PayrollOverview() {
  const [data, setData] = useState<DashData>({ period: null, payslips: [], emp201: null })
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    async function load() {
      try {
        const periodsRes = await fetch('/api/payroll/periods')
        if (!periodsRes.ok) return
        const periods: PrPeriod[] = await periodsRes.json()
        const period = periods.find(p => p.status !== 'paid') ?? periods[0] ?? null
        if (!period) return

        const [slipRes, emp201Res] = await Promise.all([
          fetch(`/api/payroll/run?period_id=${period.id}`),
          fetch(`/api/payroll/emp201?period_id=${period.id}`),
        ])
        const payslips = slipRes.ok ? await slipRes.json() : []
        const emp201   = emp201Res.ok ? await emp201Res.json() : null
        setData({ period, payslips, emp201 })
      } finally {
        setLoading(false)
      }
    }
    load()
  }, [])

  const { period, payslips, emp201 } = data
  const headcount  = payslips.length
  const gross      = payslips.reduce((s, p) => s + Number(p.gross), 0)
  const net        = payslips.reduce((s, p) => s + Number(p.net), 0)
  const paye       = payslips.reduce((s, p) => s + Number(p.paye), 0)
  const uifTotal   = payslips.reduce((s, p) => s + Number(p.uif_employee) + Number(p.uif_employer), 0)
  const sdlTotal   = payslips.reduce((s, p) => s + Number(p.sdl), 0)
  const eti        = payslips.reduce((s, p) => s + Number(p.eti_claimed), 0)
  const statutory  = paye + uifTotal + sdlTotal - eti
  const approved   = payslips.filter(p => p.status === 'approved').length

  const periodLabel = period
    ? `${monthName(period.month)} ${period.year}`
    : '—'

  const emp201Due = period
    ? `7 ${monthName(period.month === 12 ? 1 : period.month + 1)}`
    : '—'

  const currentStep =
    !period || period.status === 'open' ? 1 :
    period.status === 'calculated' ? 3 :
    period.status === 'approved' ? 4 : 4

  if (loading) {
    return (
      <div className="grid grid-cols-4 gap-3">
        {[...Array(4)].map((_, i) => (
          <div key={i} className="h-20 rounded-lg animate-pulse" style={{ background: 'var(--surface)' }} />
        ))}
      </div>
    )
  }

  return (
    <div>
      {/* KPI cards */}
      <div className="grid grid-cols-4 gap-3 mb-5">
        {[
          { label: 'Headcount',      value: String(headcount), sub: `${headcount} monthly` },
          { label: `Gross (${periodLabel})`, value: formatMoney(gross), sub: 'total payroll' },
          { label: 'Net pay',        value: formatMoney(net),  sub: 'after PAYE + UIF' },
          { label: 'Statutory due',  value: formatMoney(statutory), sub: `PAYE + UIF + SDL · ${emp201Due}`, highlight: true },
        ].map((k, i) => (
          <div
            key={i}
            className="rounded-lg p-3"
            style={{
              background: k.highlight ? 'var(--accent-soft)' : 'var(--surface)',
              border: `1px solid ${k.highlight ? 'var(--accent)' : 'var(--paper-edge)'}`,
            }}
          >
            <div className="text-xs mb-1" style={{ color: 'var(--ink-2)' }}>{k.label}</div>
            <div className="text-lg font-semibold font-mono">{k.value}</div>
            <div className="text-xs mt-0.5" style={{ color: 'var(--ink-2)' }}>{k.sub}</div>
          </div>
        ))}
      </div>

      <div className="grid gap-4" style={{ gridTemplateColumns: '1.4fr 1fr' }}>
        {/* Left: run status + statutory */}
        <div className="rounded-lg p-4" style={{ border: '1px solid var(--paper-edge)', background: 'var(--surface)' }}>
          <div className="flex justify-between items-baseline mb-3">
            <span className="font-semibold">{periodLabel} run · status</span>
            {period && (
              <span className="text-xs" style={{ color: 'var(--ink-2)' }}>
                pay date · {period.pay_date}
              </span>
            )}
          </div>

          <div className="grid grid-cols-4 gap-2 mb-4">
            {STEPS.map((s) => {
              const done   = currentStep > s.n
              const active = currentStep === s.n
              return (
                <Link
                  key={s.n}
                  href={s.href}
                  className="rounded p-2 block"
                  style={{
                    border: `1.5px solid ${active ? 'var(--accent)' : done ? 'var(--ink)' : 'var(--paper-edge)'}`,
                    background: active ? 'var(--accent-soft)' : 'var(--surface)',
                  }}
                >
                  <div
                    className="text-xs font-semibold mb-0.5"
                    style={{ color: active ? 'var(--accent)' : done ? 'var(--ink)' : 'var(--ink-2)' }}
                  >
                    {done ? '✓' : s.n}. {s.title}
                  </div>
                  <div className="text-xs" style={{ color: 'var(--ink-2)' }}>
                    {s.n === 3 && headcount > 0 ? `${approved} of ${headcount} approved` : s.sub}
                  </div>
                </Link>
              )
            })}
          </div>

          <div className="border-t pt-3" style={{ borderColor: 'var(--paper-edge)' }}>
            <div className="text-xs font-semibold mb-2">Statutory breakdown</div>
            <table className="w-full text-xs">
              <tbody>
                {[
                  ['PAYE',               paye,      'EMP201 line 1101'],
                  ['UIF (employee 1%)',  payslips.reduce((s, p) => s + Number(p.uif_employee), 0), 'capped @ R177.12'],
                  ['UIF (employer 1%)',  payslips.reduce((s, p) => s + Number(p.uif_employer), 0), 'EMP201 line 1102'],
                  ['SDL (1% payroll)',   sdlTotal,   'EMP201 line 1103'],
                  ['ETI claimed',        -eti,       'reduces PAYE liability'],
                  ['Total to SARS',      statutory,  `pay before ${emp201Due}`],
                ].map(([label, amount, note], i) => (
                  <tr
                    key={i}
                    className="border-b"
                    style={{
                      borderColor: 'var(--paper-edge)',
                      fontWeight: i === 5 ? 700 : 400,
                      background: i === 5 ? 'var(--accent-soft)' : 'transparent',
                    }}
                  >
                    <td className="py-1 pr-2">{label}</td>
                    <td className="py-1 font-mono text-right pr-3">
                      {formatMoney(Number(amount))}
                    </td>
                    <td className="py-1" style={{ color: 'var(--ink-2)' }}>{note}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        {/* Right: needs you */}
        <div className="rounded-lg p-4" style={{ border: '1px solid var(--paper-edge)', background: 'var(--surface)' }}>
          <div className="font-semibold mb-3">Needs you</div>
          <div className="flex flex-col gap-2">
            {[
              ...(period?.status === 'open' ? [{ t: `Calculate ${periodLabel} payroll`, s: 'employees loaded', tone: 'accent', href: '/payroll/run' }] : []),
              ...(emp201?.status === 'pending' ? [{ t: `EMP201 ${periodLabel} pending`, s: `due ${emp201Due}`, tone: 'warn', href: '/payroll/emp201' }] : []),
              ...NEEDS_YOU.map(n => ({ ...n, href: '/payroll/emp201' })),
            ].map((x, i) => (
              <Link
                key={i}
                href={x.href}
                className="rounded p-2 block"
                style={{
                  border: `1.5px solid ${x.tone === 'accent' ? 'var(--accent)' : x.tone === 'warn' ? '#c0392b' : 'var(--paper-edge)'}`,
                  background: x.tone === 'accent' ? 'var(--accent-soft)' : x.tone === 'warn' ? '#fdecea' : 'var(--surface)',
                }}
              >
                <div className="text-sm font-medium">{x.t}</div>
                <div className="text-xs mt-0.5" style={{ color: 'var(--ink-2)' }}>{x.s}</div>
              </Link>
            ))}
          </div>

          <div className="mt-4 text-xs" style={{ color: 'var(--muted)', fontStyle: 'italic' }}>
            tax tables · SARS 2025/26 · update each March
          </div>
        </div>
      </div>
    </div>
  )
}
