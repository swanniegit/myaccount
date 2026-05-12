import { NextRequest, NextResponse } from 'next/server'
import { createServerClient } from '@/lib/supabase-server'
import { requireApiKey } from '@/lib/livehis-push/auth'

interface SyncItem {
  external_ref: string
  total: number
}

export async function POST(req: NextRequest) {
  const authError = requireApiKey(req)
  if (authError) return authError

  let body: { invoices: SyncItem[] }
  try {
    body = await req.json()
  } catch {
    return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 })
  }

  const { invoices } = body
  if (!Array.isArray(invoices) || invoices.length === 0) {
    return NextResponse.json({ error: 'invoices array required' }, { status: 400 })
  }

  const supabase = createServerClient()
  const diffs: { external_ref: string; number: string; his_total: number; acct_total: number }[] = []

  for (const item of invoices) {
    const { data: existing } = await supabase
      .from('acct_invoices')
      .select('id, number, total')
      .eq('external_ref', item.external_ref)
      .maybeSingle()

    if (!existing) continue

    const acctTotal = parseFloat(String(existing.total))
    if (Math.abs(item.total - acctTotal) > 0.01) {
      diffs.push({
        external_ref: item.external_ref,
        number: existing.number,
        his_total: item.total,
        acct_total: acctTotal,
      })
      await supabase
        .from('acct_invoices')
        .update({ total: item.total })
        .eq('id', existing.id)
    }
  }

  return NextResponse.json({ diffs })
}
