import type { LauncherModule } from './types'

// Tiles mirror the green-highlighted items on Dashboard.pdf (page 1 = GL, page 2 = Customers).
// `soon: true` marks a stub route that exists but is not yet implemented (no 404).

export const GENERAL_LEDGER_MODULE: LauncherModule = {
  title: 'Die General Ledger',
  sections: [
    {
      title: 'Transactions',
      tone: 'txn',
      tiles: [
        { label: 'Transactions', href: '/journal' },
        { label: 'Cashbook Batches', href: '/banking?view=batches' },
        { label: 'Journal Batches', href: '/journal?view=batches' },
        { label: 'Bank Reconciliation', href: '/banking?view=reconcile' },
        { label: 'Transactional Export', href: '/dashboard/export' },
      ],
    },
    {
      title: 'Enquiries',
      tone: 'enquiry',
      tiles: [
        { label: 'Ledger Enquiries', href: '/ledger' },
      ],
    },
    {
      title: 'Reports',
      tone: 'report',
      tiles: [
        { label: 'Reports', href: '/reports' },
        { label: 'Account Transactions', href: '/ledger?view=transactions' },
        { label: 'Balance Sheet', href: '/reports/balance-sheet' },
        { label: 'Bank Reconciliation', href: '/banking?view=reconcile' },
        { label: 'Cashbook', href: '/banking?view=cashbook' },
        { label: 'Income Statement', href: '/reports/income-statement' },
        { label: 'Trial Balance', href: '/reports/trial-balance' },
      ],
    },
  ],
}

export const CUSTOMERS_MODULE: LauncherModule = {
  title: 'Customers',
  sections: [
    {
      title: 'Transactions',
      tone: 'txn',
      tiles: [
        { label: 'Transactions', href: '/sales' },
        { label: 'Statement Run', href: '/customers/statements/run' },
        { label: 'Interest Charging', href: '/customers/interest', soon: true },
        { label: 'Credit Note', href: '/sales/credit-note' },
        { label: 'Invoice', href: '/sales/new' },
      ],
    },
    {
      title: 'Enquiries',
      tone: 'enquiry',
      tiles: [
        { label: 'Enquiries', href: '/customers/enquiries' },
        { label: 'Transaction Enquiries', href: '/customers/enquiries/transactions' },
      ],
    },
    {
      title: 'Reports',
      tone: 'report',
      tiles: [
        { label: 'Reports', href: '/customers/reports' },
        { label: 'Age Analysis', href: '/customers/reports/age-analysis' },
        { label: 'Allocations', href: '/customers/allocations' },
        { label: 'Customer Listing', href: '/customers/listing' },
        { label: 'Sales Analysis', href: '/customers/reports/sales-analysis' },
        { label: 'Statements', href: '/customers/reports/statements' },
        { label: 'Transactions', href: '/customers/reports/transactions' },
      ],
    },
  ],
}
