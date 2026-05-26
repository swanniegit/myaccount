import Link from 'next/link'

interface Props {
  title: string
  backHref: string
  backLabel?: string
  description?: string
}

export default function ComingSoon({ title, backHref, backLabel = 'Back', description }: Props) {
  return (
    <div className="p-5 max-w-5xl">
      <div className="mb-4">
        <h1 className="text-xl font-semibold">{title}</h1>
        <p className="text-xs mt-0.5 text-ink-2">{description ?? 'This screen is coming soon.'}</p>
      </div>
      <div className="card p-8 text-center">
        <p className="text-sm text-ink-2 mb-1">Coming soon</p>
        <p className="text-xs text-muted mb-4">{title} is not built yet.</p>
        <Link href={backHref} className="btn btn-sm btn-secondary">← {backLabel}</Link>
      </div>
    </div>
  )
}
