export const dynamic = 'force-dynamic'

import { NextResponse } from 'next/server'
import { createServerClient } from '@/lib/supabase-server'

export async function POST(request: Request) {
  const { bank_transaction_id, account_id, description } = await request.json()

  if (!bank_transaction_id || !account_id) {
    return NextResponse.json({ error: 'Missing required fields' }, { status: 400 })
  }

  const supabase = createServerClient()

  // Load the bank transaction + its bank account (to get the GL account_id)
  const { data: txn, error: txnError } = await supabase
    .from('acct_bank_transactions')
    .select('id, date, description, amount, bank_account_id, acct_bank_accounts(account_id)')
    .eq('id', bank_transaction_id)
    .single()

  if (txnError || !txn) {
    return NextResponse.json({ error: 'Transaction not found' }, { status: 404 })
  }

  const bankGlAccountId = (txn.acct_bank_accounts as { account_id: string | null })?.account_id
  if (!bankGlAccountId) {
    return NextResponse.json({ error: 'Bank account has no GL account linked' }, { status: 400 })
  }

  const amt = Math.abs(Number(txn.amount))
  const isDeposit = Number(txn.amount) > 0
  const entryDescription = description || txn.description

  // Create journal entry
  const { data: entry, error: entryError } = await supabase
    .from('acct_journal_entries')
    .insert({
      date: txn.date,
      description: entryDescription,
      source: 'bank_import',
      is_posted: true,
    })
    .select()
    .single()

  if (entryError || !entry) {
    return NextResponse.json({ error: entryError?.message ?? 'Failed to create journal entry' }, { status: 500 })
  }

  // Double-entry lines:
  // Deposit  (amount > 0): DR bank GL account, CR selected account
  // Withdrawal (amount < 0): DR selected account, CR bank GL account
  const lines = isDeposit
    ? [
        { entry_id: entry.id, account_id: bankGlAccountId, debit: amt, credit: 0, description: entryDescription },
        { entry_id: entry.id, account_id, debit: 0, credit: amt, description: entryDescription },
      ]
    : [
        { entry_id: entry.id, account_id, debit: amt, credit: 0, description: entryDescription },
        { entry_id: entry.id, account_id: bankGlAccountId, debit: 0, credit: amt, description: entryDescription },
      ]

  const { data: insertedLines, error: linesError } = await supabase
    .from('acct_journal_lines')
    .insert(lines)
    .select('id, account_id')

  if (linesError || !insertedLines) {
    await supabase.from('acct_journal_entries').delete().eq('id', entry.id)
    return NextResponse.json({ error: linesError?.message ?? 'Failed to create journal lines' }, { status: 500 })
  }

  // The bank-side journal line is the one pointing to the bank GL account
  const bankLine = insertedLines.find(l => l.account_id === bankGlAccountId)

  // Link the journal line back to the bank transaction
  await supabase
    .from('acct_bank_transactions')
    .update({ journal_line_id: bankLine?.id ?? insertedLines[0].id, is_reconciled: true })
    .eq('id', bank_transaction_id)

  return NextResponse.json({ ok: true, journal_entry_id: entry.id })
}
