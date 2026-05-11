import { cn } from '@/lib/utils'
import type { ElementType } from 'react'

interface Props {
  variant?: 'primary' | 'secondary' | 'ghost' | 'danger'
  size?: 'sm' | 'md'
  as?: ElementType
  className?: string
  children?: React.ReactNode
  [key: string]: unknown
}

export default function Button({
  variant = 'primary',
  size = 'md',
  className,
  children,
  as,
  ...props
}: Props) {
  const Component = as ?? 'button'
  const base =
    'inline-flex items-center justify-center font-medium rounded transition-opacity disabled:opacity-40 cursor-pointer'
  const sizeClass = size === 'sm' ? 'px-3 py-1 text-xs gap-1' : 'px-4 py-1.5 text-sm gap-1.5'

  const styles: Record<string, React.CSSProperties> = {
    primary: { background: 'var(--accent)', color: '#fff', border: 'none' },
    secondary: {
      background: 'transparent',
      color: 'var(--ink)',
      border: '1.5px solid var(--ink)',
      borderRadius: 999,
    },
    ghost: {
      background: 'transparent',
      color: 'var(--ink-2)',
      border: '1px solid var(--paper-edge)',
    },
    danger: { background: 'var(--negative)', color: '#fff', border: 'none' },
  }

  return (
    <Component className={cn(base, sizeClass, className)} style={styles[variant]} {...props}>
      {children}
    </Component>
  )
}
