'use client'
import Link from 'next/link'

const REPORT_TABS = [
  { label: 'Trial Balance',    href: '/reports/trial-balance' },
  { label: 'Income Statement', href: '/reports/income-statement' },
  { label: 'Balance Sheet',    href: '/reports/balance-sheet' },
  { label: 'Cash Flow',        href: '/reports/cash-flow' },
  { label: 'VAT Detail',       href: '/vat' },
]

export default function PayeSummaryPage() {
  return (
    <div className="p-5 max-w-3xl">
      <div className="mb-1">
        <h1 className="text-xl font-semibold">Reports · PAYE Summary</h1>
        <p className="text-xs mt-0.5 text-ink-2">Employer PAYE and payroll reporting</p>
      </div>

      <div className="flex gap-1 mb-4 flex-wrap">
        {REPORT_TABS.map(tab => (
          <Link key={tab.label} href={tab.href} className="pill no-underline" data-active={false}>
            {tab.label}
          </Link>
        ))}
      </div>

      <div className="card p-6">
        <p className="text-sm mb-6 text-ink-2">PAYE detail is managed in the Payroll module.</p>
        <div className="flex gap-3 flex-wrap">
          <Link href="/payroll" className="btn btn-primary no-underline">Go to Payroll →</Link>
          <Link href="/payroll/emp201" className="btn btn-secondary no-underline">EMP201 submission →</Link>
        </div>
      </div>
    </div>
  )
}
