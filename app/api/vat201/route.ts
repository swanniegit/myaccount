import { NextRequest, NextResponse } from 'next/server'
import { createServerClient } from '@/lib/supabase-server'
import { computeVat201 } from '@/lib/vat/compute'

// V-01 / V-02 / V-05
// VAT 201 computed from tax-type-tagged GL lines.
// Box logic per SARS VAT 201 declaration form.
// Computation shared with /api/vat-clearing via lib/vat/compute.ts.

export async function GET(req: NextRequest) {
  const { searchParams } = req.nextUrl
  const from = searchParams.get('from')
  const to   = searchParams.get('to')

  if (!from || !to) {
    return NextResponse.json({ error: 'from and to query params required (YYYY-MM-DD)' }, { status: 400 })
  }

  const supabase = createServerClient()

  try {
    const result = await computeVat201(supabase, from, to)
    return NextResponse.json(result)
  } catch (err) {
    return NextResponse.json({ error: (err as Error).message }, { status: 500 })
  }
}
