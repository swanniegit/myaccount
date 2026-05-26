import Link from 'next/link'
import ModuleLauncher from '@/components/dashboard/ModuleLauncher'
import GlanceStrip from '@/components/dashboard/GlanceStrip'
import { GENERAL_LEDGER_MODULE } from '@/lib/dashboard/modules'

export default function DashboardPage() {
  return (
    <div className="p-5 max-w-5xl">

      {/* ── Header ────────────────────────────────────────────────────────── */}
      <div className="flex items-start justify-between mb-5">
        <div>
          <h1 className="text-xl font-semibold">{GENERAL_LEDGER_MODULE.title}</h1>
          <p className="text-xs mt-0.5 text-ink-2">General Ledger · module home</p>
        </div>
        <div className="flex gap-2">
          <Link href="/sales/new"         className="btn btn-secondary text-xs">+ Invoice</Link>
          <Link href="/journal"           className="btn btn-secondary text-xs">+ Journal entry</Link>
          <Link href="/settings/periods"  className="btn btn-ghost    text-xs">Periods</Link>
        </div>
      </div>

      <GlanceStrip />

      <ModuleLauncher module={GENERAL_LEDGER_MODULE} />
    </div>
  )
}
