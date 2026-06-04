export const dynamic = 'force-dynamic'

import { NextResponse } from 'next/server'
import { createServerClient } from '@/lib/supabase-server'
import { importStatement } from '@/lib/banking/import-statement'
import type { BankTxnInput } from '@/lib/banking/parse-statement-csv'

export async function POST(req: Request) {
  const { bankAccountId, statementAccountNumber, closingBalance, transactions } = (await req.json()) as {
    bankAccountId?: string
    statementAccountNumber?: string | null
    closingBalance?: number | null
    transactions?: BankTxnInput[]
  }

  if (!bankAccountId) {
    return NextResponse.json({ error: 'Missing bank account' }, { status: 400 })
  }
  if (!Array.isArray(transactions) || transactions.length === 0) {
    return NextResponse.json({ error: 'No transactions to import' }, { status: 400 })
  }

  try {
    const result = await importStatement(createServerClient(), {
      bankAccountId, statementAccountNumber, closingBalance, transactions,
    })
    return NextResponse.json(result)
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Import failed'
    const status = message === 'Bank account not found' ? 404
      : message.startsWith('Statement is for') ? 409
      : 500
    return NextResponse.json({ error: message }, { status })
  }
}
