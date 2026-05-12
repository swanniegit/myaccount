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

  // Build lookup map from input
  const inputMap = new Map<string, number>()
  for (const item of invoices) {
    inputMap.set(item.external_ref, item.total)
  }

  // Single batch query for all external_refs
  const refs = invoices.map(i => i.external_ref)
  const { data: existing, error } = await supabase
    .from('acct_invoices')
    .select('id, external_ref, number, total')
    .in('external_ref', refs)

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  const diffs: { external_ref: string; number: string; his_total: number; acct_total: number }[] = []
  const updateIds: { id: string; total: number }[] = []

  for (const row of existing ?? []) {
    const hisTotal = inputMap.get(row.external_ref)
    if (hisTotal === undefined) continue
    const acctTotal = parseFloat(String(row.total))
    if (Math.abs(hisTotal - acctTotal) > 0.01) {
      diffs.push({ external_ref: row.external_ref, number: row.number, his_total: hisTotal, acct_total: acctTotal })
      updateIds.push({ id: row.id, total: hisTotal })
    }
  }

  // Batch update mismatches one by one (Supabase JS doesn't support bulk update with different values)
  for (const upd of updateIds) {
    await supabase.from('acct_invoices').update({ total: upd.total }).eq('id', upd.id)
  }

  return NextResponse.json({ diffs })
}
