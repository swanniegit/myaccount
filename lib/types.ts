export type AccountType = 'asset' | 'liability' | 'equity' | 'revenue' | 'expense'
export type NormalBalance = 'debit' | 'credit'
export type InvoiceStatus = 'draft' | 'sent' | 'paid' | 'overdue' | 'void'
export type ContactType = 'customer' | 'supplier' | 'both'
export type EntrySource = 'manual' | 'bank_import' | 'invoice' | 'bill'

export interface Account {
  id: string
  code: string
  name: string
  type: AccountType
  sub_type: string | null
  is_vat_account: boolean
  normal_balance: NormalBalance
  parent_id: string | null
  is_active: boolean
  created_at: string
}

export interface JournalEntry {
  id: string
  date: string
  description: string
  reference: string | null
  source: EntrySource
  is_posted: boolean
  created_at: string
  lines?: JournalLine[]
}

export interface JournalLine {
  id: string
  entry_id: string
  account_id: string
  debit: number
  credit: number
  description: string | null
  created_at: string
  account?: Account
}

export interface Contact {
  id: string
  name: string
  type: ContactType
  email: string | null
  phone: string | null
  vat_number: string | null
  address: string | null
  is_active: boolean
  created_at: string
  external_ref?: string
}

export interface Invoice {
  id: string
  number: string
  contact_id: string | null
  date: string
  due_date: string | null
  status: InvoiceStatus
  subtotal: number
  vat_amount: number
  total: number
  notes: string | null
  journal_entry_id: string | null
  created_at: string
  external_ref?: string
  contact?: Contact
  lines?: InvoiceLine[]
}

export interface InvoiceLine {
  id: string
  invoice_id: string
  description: string
  quantity: number
  unit_price: number
  vat_rate: number
  account_id: string | null
  line_total: number
}

export interface BankAccount {
  id: string
  name: string
  bank_name: string | null
  account_number: string | null
  account_id: string | null
  balance: number
  is_active: boolean
}

export interface BankTransaction {
  id: string
  bank_account_id: string
  date: string
  description: string
  amount: number
  is_reconciled: boolean
  journal_line_id: string | null
  created_at: string
}

export interface Company {
  id: string
  name: string
  registration_number: string | null
  vat_number: string | null
  tax_year_end: number
  address: string | null
  created_at: string
}

export interface AccountBalance {
  account: Account
  totalDebits: number
  totalCredits: number
  balance: number
}

export interface TrialBalanceLine {
  account: Account
  debit: number
  credit: number
}

export interface TrialBalance {
  lines: TrialBalanceLine[]
  totalDebit: number
  totalCredit: number
  isBalanced: boolean
}
