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
        <p className="text-xs mt-0.5" style={{ color: 'var(--ink-2)' }}>Employer PAYE and payroll reporting</p>
      </div>

      <div className="flex gap-1 mb-4 flex-wrap">
        {REPORT_TABS.map(tab => (
          <Link
            key={tab.label}
            href={tab.href}
            className="px-3 py-1 text-xs rounded font-medium"
            style={{
              background: 'var(--surface)',
              color: 'var(--ink-2)',
              border: '1px solid var(--paper-edge)',
              textDecoration: 'none',
            }}
          >
            {tab.label}
          </Link>
        ))}
      </div>

      <div
        className="rounded-lg p-6"
        style={{ background: 'var(--surface)', border: '1px solid var(--paper-edge)' }}
      >
        <p className="text-sm mb-6" style={{ color: 'var(--ink-2)' }}>
          PAYE detail is managed in the Payroll module.
        </p>
        <div className="flex gap-3 flex-wrap">
          <Link
            href="/payroll"
            className="inline-flex items-center px-4 py-1.5 text-sm font-medium rounded"
            style={{ background: 'var(--accent)', color: '#fff', textDecoration: 'none' }}
          >
            Go to Payroll →
          </Link>
          <Link
            href="/payroll/emp201"
            className="inline-flex items-center px-4 py-1.5 text-sm font-medium rounded"
            style={{ background: 'transparent', color: 'var(--ink)', border: '1.5px solid var(--ink)', borderRadius: 999, textDecoration: 'none' }}
          >
            EMP201 submission →
          </Link>
        </div>
      </div>
    </div>
  )
}
