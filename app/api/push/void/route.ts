import { NextRequest, NextResponse } from 'next/server'
import { createServerClient } from '@/lib/supabase-server'
import type { PushVoidRequest } from '@/lib/livehis-push/types'
import { requireApiKey } from '@/lib/livehis-push/auth'

export async function POST(req: NextRequest) {
  const authError = requireApiKey(req)
  if (authError) return authError

  let body: PushVoidRequest
  try {
    body = await req.json()
  } catch {
    return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 })
  }

  const { invoice_external_ref } = body
  if (!invoice_external_ref) {
    return NextResponse.json({ error: 'Missing invoice_external_ref' }, { status: 400 })
  }

  const supabase = createServerClient()

  const { data: invoice, error: findErr } = await supabase
    .from('acct_invoices')
    .select('id, status')
    .eq('external_ref', invoice_external_ref)
    .maybeSingle()

  if (findErr) return NextResponse.json({ error: findErr.message }, { status: 500 })
  if (!invoice) return NextResponse.json({ error: 'Invoice not found' }, { status: 404 })

  // Delegate the reversal + status update to a single atomic DB function.
  const { data: result, error: voidErr } = await supabase
    .rpc('acct_void_invoice', { p_invoice_id: invoice.id })

  if (voidErr) return NextResponse.json({ error: voidErr.message }, { status: 422 })

  return NextResponse.json({ success: true, ...result })
}
