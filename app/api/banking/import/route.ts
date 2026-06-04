export const dynamic = 'force-dynamic'

import { NextResponse } from 'next/server'
import { createServerClient } from '@/lib/supabase-server'
import { importStatement } from '@/lib/banking/import-statement'
import type { BankTxnInput } from '@/lib/banking/parse-statement-csv'

export async function POST(req: Request) {
  const { accountNumber, accountName, closingBalance, transactions } = (await req.json()) as {
    accountNumber?: string
    accountName?: string
    closingBalance?: number | null
    transactions?: BankTxnInput[]
  }

  if (!accountNumber) {
    return NextResponse.json({ error: 'Missing account number' }, { status: 400 })
  }
  if (!Array.isArray(transactions) || transactions.length === 0) {
    return NextResponse.json({ error: 'No transactions to import' }, { status: 400 })
  }

  try {
    const result = await importStatement(createServerClient(), {
      accountNumber, accountName, closingBalance, transactions,
    })
    return NextResponse.json(result)
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Import failed'
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
