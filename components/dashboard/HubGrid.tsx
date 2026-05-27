import Link from 'next/link'

export interface HubItem {
  label: string
  href: string
  description?: string
}

export default function HubGrid({ items }: { items: HubItem[] }) {
  return (
    <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
      {items.map(it => (
        <Link key={it.href} href={it.href} className="card p-4 no-underline hover:opacity-80">
          <p className="text-sm font-medium text-ink">{it.label}</p>
          {it.description && <p className="text-xs mt-1 text-ink-2">{it.description}</p>}
        </Link>
      ))}
    </div>
  )
}
