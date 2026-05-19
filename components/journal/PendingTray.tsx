import { formatMoney } from '@/lib/utils'
import type { PendingChip } from '@/lib/journal/types'

interface Props {
  chips: PendingChip[]
  dragging: PendingChip | null
  onDragStart: (chip: PendingChip) => void
  onDragEnd: (chipId: string) => void
}

export default function PendingTray({ chips, dragging, onDragStart, onDragEnd }: Props) {
  return (
    <motion
      className="flex items-center gap-2 p-2 rounded mb-4 flex-wrap"
      style={{ background: 'rgba(234,227,210,0.5)', border: '1.5px dashed var(--ink-2)' }}
    >
      <span className="text-xs shrink-0 text-ink-2">Pending tray →</span>
      {chips.map(chip => (
        <motion
          key={chip.id}
          draggable
          onDragStart={() => onDragStart(chip)}
          onDragEnd={() => onDragEnd(chip.id)}
          className="flex flex-col px-3 py-2 rounded cursor-grab select-none"
          style={{
            background: dragging?.id === chip.id ? 'var(--accent)' : 'var(--surface)',
            border: `1.5px solid ${dragging?.id === chip.id ? 'var(--accent)' : 'var(--paper-edge)'}`,
            color: dragging?.id === chip.id ? '#fff' : 'var(--ink)',
            minWidth: 120,
          }}
        >
          <span className="font-mono text-xs font-semibold">{formatMoney(chip.amount)}</span>
          <span className="text-xs">{chip.label}</span>
          <span
            className="text-xs"
            style={{ color: dragging?.id === chip.id ? 'rgba(255,255,255,0.7)' : 'var(--muted)' }}
          >
            {chip.ref}
          </span>
        </motion>
      ))}
      {chips.length === 0 && <span className="text-xs text-muted">All posted ✓</span>}
    </motion>
  )
}

// Avoid importing motion — use div
function motion({ className, style, children, ...rest }: React.HTMLAttributes<HTMLDivElement> & { style?: React.CSSProperties }) {
  return (
    <motion className={className} style={style} {...rest}>
      {children}
    </motion>
  )
}
