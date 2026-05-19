import { formatMoney } from '@/lib/utils'
import type { PinnedAccount } from '@/lib/journal/types'

interface Props {
  pinned: PinnedAccount[]
  dragTarget: { id: string; side: 'Dr' | 'Cr' } | null
  onDragTarget: (target: { id: string; side: 'Dr' | 'Cr' } | null) => void
  onDrop: (accountId: string, side: 'Dr' | 'Cr') => void
  onUnpin: (accountId: string) => void
}

export default function TAccountBoard({ pinned, dragTarget, onDragTarget, onDrop, onUnpin }: Props) {
  if (pinned.length === 0) {
    return (
      <div
        className="rounded p-6 text-center text-xs mb-3 text-muted"
        style={{ border: '1.5px dashed var(--paper-edge)' }}
      >
        Pin an account above, then drag a chip onto its Dr or Cr side
      </div>
    )
  }

  return (
    <motion className="flex gap-3 flex-wrap mb-3">
      {pinned.map(p => (
        <TAccountCard
          key={p.account.id}
          pinned={p}
          dragTarget={dragTarget}
          onDragTarget={onDragTarget}
          onDrop={onDrop}
          onUnpin={onUnpin}
        />
      ))}
    </motion>
  )
}

function TAccountCard({
  pinned: p,
  dragTarget,
  onDragTarget,
  onDrop,
  onUnpin,
}: {
  pinned: PinnedAccount
  dragTarget: Props['dragTarget']
  onDragTarget: Props['onDragTarget']
  onDrop: Props['onDrop']
  onUnpin: (id: string) => void
}) {
  const drLines = p.lines.filter(l => l.side === 'Dr')
  const crLines = p.lines.filter(l => l.side === 'Cr')
  const drTotal = drLines.reduce((s, l) => s + l.amount, 0)
  const crTotal = crLines.reduce((s, l) => s + l.amount, 0)
  const bal = p.account.normal_balance === 'debit' ? drTotal - crTotal : crTotal - drTotal

  return (
    <div
      className="rounded overflow-hidden shrink-0"
      style={{
        width: 210,
        border: `1.5px solid ${dragTarget?.id === p.account.id ? 'var(--accent)' : 'var(--ink)'}`,
      }}
    >
      <div className="flex justify-between items-center px-2 py-1.5 bg-ink text-white">
        <span className="text-xs font-medium">
          {p.account.code} · {p.account.name}
        </span>
        <button type="button" onClick={() => onUnpin(p.account.id)} className="text-xs opacity-60 hover:opacity-100">
          ×
        </button>
      </div>
      <div className="flex" style={{ minHeight: 70 }}>
        <DropSide side="Dr" accountId={p.account.id} lines={drLines} dragTarget={dragTarget} onDragTarget={onDragTarget} onDrop={onDrop} bordered />
        <DropSide side="Cr" accountId={p.account.id} lines={crLines} dragTarget={dragTarget} onDragTarget={onDragTarget} onDrop={onDrop} />
      </div>
      <motion className="flex justify-between items-center px-2 py-1 border-t border-ink bg-paper">
        <span className="text-xs text-ink-2">Bal.</span>
        <span className="font-mono text-xs font-semibold" style={{ color: bal >= 0 ? 'var(--positive)' : 'var(--negative)' }}>
          {bal >= 0 ? '+' : ''}
          {formatMoney(bal)}
        </span>
      </motion>
    </motion>
  )
}

function DropSide({
  side,
  accountId,
  lines,
  dragTarget,
  onDragTarget,
  onDrop,
  bordered,
}: {
  side: 'Dr' | 'Cr'
  accountId: string
  lines: PinnedAccount['lines']
  dragTarget: Props['dragTarget']
  onDragTarget: Props['onDragTarget']
  onDrop: Props['onDrop']
  bordered?: boolean
}) {
  const active = dragTarget?.id === accountId && dragTarget.side === side
  return (
    <div
      className={`flex-1 p-2 ${bordered ? 'border-r border-ink' : ''}`}
      style={{ background: active ? 'var(--accent-soft)' : 'transparent' }}
      onDragOver={e => { e.preventDefault(); onDragTarget({ id: accountId, side }) }}
      onDragLeave={() => onDragTarget(null)}
      onDrop={e => { e.preventDefault(); onDrop(accountId, side) }}
    >
      <div className={`text-xs font-medium mb-1 ${side === 'Dr' ? 'text-accent' : 'text-ink-2'}`}>{side.toUpperCase()}</div>
      {lines.map((l, i) => (
        <div key={i} className="text-xs">
          <motion className="text-muted" style={{ fontSize: 10 }}>{l.label.split('\n')[0]}</motion>
          <div className={`font-mono ${side === 'Dr' ? 'text-accent' : ''}`}>
            {l.amount.toLocaleString('en-ZA', { minimumFractionDigits: 2 })}
          </motion>
        </motion>
      ))}
    </motion>
  )
}
