import { NextRequest, NextResponse } from 'next/server'
import { createServerClient } from '@/lib/supabase-server'

export async function GET() {
  const supabase = createServerClient()
  const { data, error } = await supabase
    .from('acct_company')
    .select('*')
    .limit(1)
    .maybeSingle()

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json(data ?? {})
}

export async function POST(req: NextRequest) {
  const supabase = createServerClient()
  const body = await req.json()

  const { data: existing } = await supabase
    .from('acct_company')
    .select('id')
    .limit(1)
    .maybeSingle()

  const payload = {
    name:                  body.name ?? '',
    registration_number:   body.registration_number ?? null,
    vat_number:            body.vat_number ?? null,
    tax_year_end:          body.tax_year_end ?? 2,
    address:               body.address ?? null,
    tax_number:            body.tax_number ?? null,
    vat_registration_date: body.vat_registration_date ?? null,
    vat_cycle:             body.vat_cycle ?? null,
    paye_ref:              body.paye_ref ?? null,
    efiling_user:          body.efiling_user ?? null,
    books_locked_through:  body.books_locked_through ?? null,
    default_vat:           body.default_vat ?? '15',
    inventory_method:      body.inventory_method ?? 'FIFO',
    phone:                 body.phone ?? null,
    email:                 body.email ?? null,
  }

  let error
  if (existing) {
    ;({ error } = await supabase.from('acct_company').update(payload).eq('id', existing.id))
  } else {
    ;({ error } = await supabase.from('acct_company').insert(payload))
  }

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ ok: true })
}
