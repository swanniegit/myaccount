import Link from 'next/link'
import ModuleLauncher from '@/components/dashboard/ModuleLauncher'
import { CUSTOMERS_MODULE } from '@/lib/dashboard/modules'

export default function CustomersPage() {
  return (
    <div className="p-5 max-w-5xl">
      <div className="flex items-start justify-between mb-5">
        <div>
          <h1 className="text-xl font-semibold">{CUSTOMERS_MODULE.title}</h1>
          <p className="text-xs mt-0.5 text-ink-2">Accounts receivable · module home</p>
        </div>
        <div className="flex gap-2">
          <Link href="/sales/new"          className="btn btn-secondary text-xs">+ Invoice</Link>
          <Link href="/customers/listing"  className="btn btn-ghost    text-xs">Customer Listing</Link>
        </div>
      </div>

      <ModuleLauncher module={CUSTOMERS_MODULE} />
    </div>
  )
}
