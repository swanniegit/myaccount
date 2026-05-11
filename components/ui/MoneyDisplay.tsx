import { formatMoney } from '@/lib/utils'
import { cn } from '@/lib/utils'

interface Props {
  amount: number
  className?: string
  colored?: boolean
  size?: 'xs' | 'sm' | 'md' | 'lg' | 'xl'
}

const sizes = { xs: 'text-xs', sm: 'text-sm', md: 'text-sm', lg: 'text-lg', xl: 'text-2xl' }

export default function MoneyDisplay({ amount, className, colored, size = 'md' }: Props) {
  const color = colored
    ? amount >= 0
      ? 'var(--positive)'
      : 'var(--negative)'
    : undefined
  return (
    <span
      className={cn('font-mono tabular-nums', sizes[size], className)}
      style={{ color }}
    >
      {formatMoney(amount)}
    </span>
  )
}
