'use client'
import Link from 'next/link'
import { usePathname } from 'next/navigation'

const TABS = [
  { href: '/payroll',           label: 'Overview' },
  { href: '/payroll/employees', label: 'Employees' },
  { href: '/payroll/run',       label: 'Run payroll' },
  { href: '/payroll/emp201',    label: 'EMP201' },
  { href: '/payroll/irp5',      label: 'IRP5 / EMP501' },
  { href: '/payroll/leave',     label: 'Leave' },
]

export default function PayrollLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname()

  return (
    <div className="p-5 max-w-5xl">
      <div className="mb-1">
        <h1 className="text-xl font-semibold">Payroll</h1>
        <p className="text-xs mt-0.5 text-ink-2">South African payroll · SARS 2025/26</p>
      </div>

      <div className="flex gap-1.5 mb-5 mt-3 flex-wrap">
        {TABS.map(tab => (
          <Link
            key={tab.href}
            href={tab.href}
            className="pill no-underline"
            data-active={pathname === tab.href}
          >
            {tab.label}
          </Link>
        ))}
      </div>

      {children}
    </div>
  )
}
