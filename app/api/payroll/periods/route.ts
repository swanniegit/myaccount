import { NextResponse } from 'next/server'
import { createServerClient } from '@/lib/supabase-server'

export async function GET() {
  const supabase = createServerClient()
  const { data, error } = await supabase
    .from('pr_periods')
    .select('*')
    .order('year', { ascending: false })
    .order('month', { ascending: false })
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json(data)
}

export async function POST(req: Request) {
  const supabase = createServerClient()
  const body = await req.json()

  const { data, error } = await supabase
    .from('pr_periods')
    .insert({
      year:       Number(body.year),
      month:      Number(body.month),
      start_date: body.start_date,
      end_date:   body.end_date,
      pay_date:   body.pay_date,
      status:     'open',
    })
    .select()
    .single()

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json(data)
}
