export function formatMoney(amount: number): string {
  const abs = Math.abs(amount)
  const formatted = abs.toLocaleString('en-ZA', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })
  return (amount < 0 ? '-R ' : 'R ') + formatted
}

export function formatDate(dateStr: string): string {
  return new Date(dateStr).toLocaleDateString('en-ZA', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
  })
}

export function today(): string {
  return new Date().toISOString().split('T')[0]
}

export function cn(...classes: (string | undefined | null | false)[]): string {
  return classes.filter(Boolean).join(' ')
}

export const VAT_RATE = 0.15

export function calcVAT(excl: number, rate = VAT_RATE): number {
  return Math.round(excl * rate * 100) / 100
}

export function monthName(month: number): string {
  return new Date(2000, month - 1, 1).toLocaleString('en-ZA', { month: 'long' })
}

export function round2(n: number): number {
  return Math.round(n * 100) / 100
}
