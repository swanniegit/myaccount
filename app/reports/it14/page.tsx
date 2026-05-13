'use client'
import Link from 'next/link'

const REPORT_TABS = [
  { label: 'Trial Balance',    href: '/reports/trial-balance' },
  { label: 'Income Statement', href: '/reports/income-statement' },
  { label: 'Balance Sheet',    href: '/reports/balance-sheet' },
  { label: 'Cash Flow',        href: '/reports/cash-flow' },
  { label: 'VAT Detail',       href: '/vat' },
]

export default function IT14Page() {
  return (
    <div className="p-5 max-w-3xl">
      <div className="mb-1">
        <h1 className="text-xl font-semibold">Reports · IT14 / ITR14 – Annual Income Tax</h1>
        <p className="text-xs mt-0.5 text-ink-2">Annual income tax return for companies</p>
      </div>

      <div className="flex gap-1 mb-4 flex-wrap">
        {REPORT_TABS.map(tab => (
          <Link key={tab.label} href={tab.href} className="pill no-underline" data-active={false}>
            {tab.label}
          </Link>
        ))}
      </div>

      <div className="card p-6">
        <p className="text-sm mb-6 text-ink-2">
          Annual income tax return. Complete from the Income Statement and Balance Sheet.
        </p>
        <div className="flex gap-3 flex-wrap">
          <Link href="/reports/income-statement" className="btn btn-primary no-underline">View Income Statement →</Link>
          <Link href="/reports/balance-sheet" className="btn btn-secondary no-underline">View Balance Sheet →</Link>
        </div>
      </div>
    </div>
  )
}
