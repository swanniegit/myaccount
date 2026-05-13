import { cn } from '@/lib/utils'

interface Props {
  children:   React.ReactNode
  className?: string
  accent?:    boolean
  style?:     React.CSSProperties
}

export default function Card({ children, className, accent, style }: Props) {
  return (
    <div className={cn(accent ? 'card-accent' : 'card', 'p-4', className)} style={style}>
      {children}
    </div>
  )
}
