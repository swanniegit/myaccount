import Link from 'next/link'

export default function SettingsPage() {
  return (
    <div className="p-5 max-w-2xl">
      <h1 className="text-xl font-semibold mb-4">Settings</h1>
      <div className="card divide-y divide-paper-edge">
        <Link href="/settings/periods" className="flex items-center justify-between px-4 py-3 hover:bg-paper-hover">
          <div>
            <div className="text-sm font-medium">Periods</div>
            <div className="text-xs text-ink-2">Open or close accounting periods</div>
          </div>
          <span className="text-ink-2 text-sm">›</span>
        </Link>
      </div>
    </div>
  )
}
