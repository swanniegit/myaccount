import { cn } from '@/lib/utils'

interface Props {
  children: React.ReactNode
  className?: string
  accent?: boolean
  style?: React.CSSProperties
}

export default function Card({ children, className, accent, style }: Props) {
  return (
    <div
      className={cn('rounded-lg p-4', className)}
      style={{
        background: accent ? 'var(--accent-soft)' : 'var(--surface)',
        border: `1px solid ${accent ? 'var(--accent)' : 'var(--paper-edge)'}`,
        ...style,
      }}
    >
      {children}
    </div>
  )
}
