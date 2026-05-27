import Link from 'next/link'
import HubGrid from '@/components/dashboard/HubGrid'

export default function CustomerEnquiriesPage() {
  return (
    <div className="p-5 max-w-5xl">
      <div className="mb-4">
        <Link href="/customers" className="text-xs text-accent hover:underline">← Customers</Link>
        <h1 className="text-xl font-semibold mt-1">Enquiries</h1>
        <p className="text-xs mt-0.5 text-ink-2">Read-only customer enquiries</p>
      </div>
      <HubGrid items={[
        { label: 'Transaction Enquiries', href: '/customers/enquiries/transactions', description: 'Invoices by customer, date and status' },
      ]} />
    </div>
  )
}
