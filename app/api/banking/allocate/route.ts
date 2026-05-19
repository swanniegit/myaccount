export const dynamic = 'force-dynamic'

import { NextResponse } from 'next/server'
import { createServerClient } from '@/lib/supabase-server'
import { allocateBankTransaction } from '@/lib/banking/allocate'

export async function POST(request: Request) {
  const { bank_transaction_id, account_id, description } = await request.json()

  if (!bank_transaction_id || !account_id) {
    return NextResponse.json({ error: 'Missing required fields' }, { status: 400 })
  }

  const supabase = createServerClient()

  try {
    const result = await allocateBankTransaction(supabase, {
      bank_transaction_id,
      account_id,
      description,
    })
    return NextResponse.json({ ok: true, journal_entry_id: result.journal_entry_id })
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Allocation failed'
    const status = message === 'Transaction not found' ? 404 : 500
    return NextResponse.json({ error: message }, { status })
  }
}
