'use client'
import Link from 'next/link'

const REPORT_TABS = [
  { label: 'Trial Balance',    href: '/reports/trial-balance' },
  { label: 'Income Statement', href: '/reports/income-statement' },
  { label: 'Balance Sheet',    href: '/reports/balance-sheet' },
  { label: 'Cash Flow',        href: '/reports/cash-flow' },
  { label: 'VAT Detail',       href: '/vat' },
]

export default function Emp201Page() {
  return (
    <div className="p-5 max-w-3xl">
      <div className="mb-1">
        <h1 className="text-xl font-semibold">Reports · EMP 201 (PAYE/UIF)</h1>
        <p className="text-xs mt-0.5 text-ink-2">Monthly employer declaration</p>
      </div>

      <div className="flex gap-1 mb-4 flex-wrap">
        {REPORT_TABS.map(tab => (
          <Link key={tab.label} href={tab.href} className="pill no-underline" data-active={false}>
            {tab.label}
          </Link>
        ))}
      </div>

      <div className="card p-6">
        <p className="text-sm mb-6 text-ink-2">EMP201 submission is managed in the Payroll module.</p>
        <Link href="/payroll/emp201" className="btn btn-primary no-underline">Go to EMP201 →</Link>
      </div>
    </div>
  )
}
