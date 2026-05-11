import Link from 'next/link'

const PINNED = [
  { label: 'Income statement', sub: 'Profit R –35,051', href: '/reports/income-statement' },
  { label: 'Cash position', sub: 'R 87,420', href: '/reports/cash-flow' },
  { label: 'Customer aging', sub: '3 overdue · R 18,400', href: '/customers' },
]

const STANDARD = [
  { label: 'Trial balance', href: '/reports/trial-balance' },
  { label: 'Income statement', href: '/reports/income-statement' },
  { label: 'Balance sheet', href: '/reports/balance-sheet' },
  { label: 'Cash flow', href: '/reports/cash-flow' },
  { label: 'Equity changes', href: '/reports/equity' },
  { label: 'General ledger', href: '/ledger' },
  { label: 'VAT detail', href: '/vat' },
  { label: 'PAYE summary', href: '/reports/paye' },
]

const SARS_PACKS = [
  { label: 'VAT 201', sub: 'due 25 May', href: '/vat', urgent: true },
  { label: 'EMP 201 (PAYE/UIF)', sub: 'due 7 Apr', href: '/reports/emp201' },
  { label: 'IT14 / ITR14 – annual', sub: 'Feb 2027', href: '/reports/it14' },
]

export default function ReportsPage() {
  return (
    <div className="p-5 max-w-4xl">
      <h1 className="text-xl font-semibold mb-0.5">Reports</h1>
      <p className="text-xs mb-6" style={{ color: 'var(--ink-2)' }}>
        Pinned · Statements · SARS pack · Custom
      </p>

      {/* Pinned */}
      <section className="mb-6">
        <div className="text-xs font-medium mb-3">Pinned this month</div>
        <div className="grid grid-cols-3 gap-3">
          {PINNED.map(item => (
            <Link
              key={item.label}
              href={item.href}
              className="block rounded-lg p-4 hover:opacity-80 transition-opacity"
              style={{ background: 'var(--surface)', border: '1px solid var(--paper-edge)', textDecoration: 'none' }}
            >
              <div className="text-sm font-medium mb-0.5" style={{ color: 'var(--ink)', fontStyle: 'italic' }}>{item.label}</div>
              <div className="text-xs mb-3" style={{ color: 'var(--ink-2)' }}>{item.sub}</div>
              <div
                className="rounded flex items-center justify-center"
                style={{
                  height: 48,
                  background: 'repeating-linear-gradient(45deg,var(--paper-edge) 0,var(--paper-edge) 1px,transparent 0,transparent 50%)',
                  backgroundSize: '8px 8px',
                  color: 'var(--muted)',
                  fontSize: 11,
                }}
              >
                // sparkline
              </div>
            </Link>
          ))}
        </div>
      </section>

      {/* Standard statements */}
      <section className="mb-6">
        <div className="text-xs font-medium mb-3">Standard statements</div>
        <div className="grid grid-cols-4 gap-2">
          {STANDARD.map(item => (
            <Link
              key={item.label}
              href={item.href}
              className="block px-3 py-2.5 rounded text-xs hover:opacity-80 transition-opacity"
              style={{
                background: 'var(--surface)',
                border: '1px solid var(--paper-edge)',
                color: 'var(--ink)',
                textDecoration: 'none',
              }}
            >
              {item.label} ›
            </Link>
          ))}
        </div>
      </section>

      {/* SARS submission packs */}
      <section>
        <div className="text-xs font-medium mb-3">SARS submission packs</div>
        <div className="grid grid-cols-3 gap-2">
          {SARS_PACKS.map(item => (
            <Link
              key={item.label}
              href={item.href}
              className="block px-3 py-3 rounded hover:opacity-80 transition-opacity"
              style={{
                background: item.urgent ? 'var(--accent-soft)' : 'var(--surface)',
                border: `1px solid ${item.urgent ? 'var(--accent)' : 'var(--paper-edge)'}`,
                textDecoration: 'none',
              }}
            >
              <div className="text-xs font-medium" style={{ color: item.urgent ? 'var(--accent)' : 'var(--ink)' }}>
                {item.label}
              </div>
              <div className="text-xs mt-0.5" style={{ color: item.urgent ? 'var(--accent)' : 'var(--ink-2)' }}>
                {item.sub}
              </div>
            </Link>
          ))}
        </div>
      </section>
    </div>
  )
}
