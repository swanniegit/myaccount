import type { Account } from '@/lib/types'

export interface PendingChip {
  id: string
  label: string
  amount: number
  ref: string
}

export interface TAccountLine {
  label: string
  amount: number
  side: 'Dr' | 'Cr'
}

export interface PinnedAccount {
  account: Account
  lines: TAccountLine[]
}

export interface ManualLine {
  account_id: string
  debit: string
  credit: string
}
