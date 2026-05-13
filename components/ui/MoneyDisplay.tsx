import { formatMoney, cn } from '@/lib/utils'

interface Props {
  amount:     number
  className?: string
  colored?:   boolean
  size?:      'xs' | 'sm' | 'md' | 'lg' | 'xl'
}

const sizes = { xs: 'text-xs', sm: 'text-sm', md: 'text-sm', lg: 'text-lg', xl: 'text-2xl' }

export default function MoneyDisplay({ amount, className, colored, size = 'md' }: Props) {
  const colorClass = colored
    ? amount >= 0 ? 'text-positive' : 'text-negative'
    : ''
  return (
    <span className={cn('num', sizes[size], colorClass, className)}>
      {formatMoney(amount)}
    </span>
  )
}
