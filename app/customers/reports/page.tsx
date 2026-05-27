import Link from 'next/link'
import HubGrid from '@/components/dashboard/HubGrid'

export default function CustomerReportsPage() {
  return (
    <div className="p-5 max-w-5xl">
      <div className="mb-4">
        <Link href="/customers" className="text-xs text-accent hover:underline">← Customers</Link>
        <h1 className="text-xl font-semibold mt-1">Reports</h1>
        <p className="text-xs mt-0.5 text-ink-2">Accounts-receivable reports</p>
      </div>
      <HubGrid items={[
        { label: 'Age Analysis',     href: '/customers/reports/age-analysis',  description: 'AR aging buckets per customer' },
        { label: 'Sales Analysis',   href: '/customers/reports/sales-analysis', description: 'Revenue by customer for a month' },
        { label: 'Transactions',     href: '/customers/reports/transactions',   description: 'Invoices per customer for a month' },
        { label: 'Statements',       href: '/customers/reports/statements',     description: 'Single-customer statement' },
        { label: 'Customer Listing', href: '/customers/listing',                description: 'Full customer directory' },
      ]} />
    </div>
  )
}
