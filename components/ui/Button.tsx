import { cn } from '@/lib/utils'
import type { ElementType } from 'react'

type Variant = 'primary' | 'secondary' | 'ghost' | 'danger'
type Size    = 'sm' | 'md'

interface Props {
  variant?:  Variant
  size?:     Size
  as?:       ElementType
  className?: string
  children?:  React.ReactNode
  [key: string]: unknown
}

export default function Button({
  variant  = 'primary',
  size     = 'md',
  className,
  children,
  as,
  ...props
}: Props) {
  const Tag = as ?? 'button'
  return (
    <Tag
      className={cn('btn', `btn-${size}`, `btn-${variant}`, className)}
      {...props}
    >
      {children}
    </Tag>
  )
}
