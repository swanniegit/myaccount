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
        { label: 'Cashbook Batches', href: '/banking', subtitle: 'opens Banking' },
        { label: 'Journal Batches', href: '/journal', subtitle: 'opens Journal' },
        { label: 'Bank Reconciliation', href: '/banking' },
        { label: 'Transactional Export', href: '/dashboard/export', soon: true },
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
        { label: 'Account Transactions', href: '/ledger', subtitle: 'opens Ledger' },
        { label: 'Balance Sheet', href: '/reports/balance-sheet' },
        { label: 'Bank Reconciliation', href: '/banking' },
        { label: 'Cashbook', href: '/banking', subtitle: 'opens Banking' },
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
        { label: 'Statement Run', href: '/customers/statements/run', soon: true },
        { label: 'Interest Charging', href: '/customers/interest', soon: true },
        { label: 'Credit Note', href: '/sales/credit-note', soon: true },
        { label: 'Invoice', href: '/sales/new' },
      ],
    },
    {
      title: 'Enquiries',
      tone: 'enquiry',
      tiles: [
        { label: 'Enquiries', href: '/customers/enquiries', soon: true },
        { label: 'Transaction Enquiries', href: '/customers/enquiries/transactions', soon: true },
      ],
    },
    {
      title: 'Reports',
      tone: 'report',
      tiles: [
        { label: 'Reports', href: '/customers/reports', soon: true },
        { label: 'Age Analysis', href: '/customers/reports/age-analysis', soon: true },
        { label: 'Allocations', href: '/customers/allocations', soon: true },
        { label: 'Customer Listing', href: '/customers/listing' },
        { label: 'Sales Analysis', href: '/customers/reports/sales-analysis', soon: true },
        { label: 'Statements', href: '/customers/reports/statements', soon: true },
        { label: 'Transactions', href: '/customers/reports/transactions', soon: true },
      ],
    },
  ],
}
