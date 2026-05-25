import { NextRequest, NextResponse } from 'next/server'
import { createServerClient } from '@/lib/supabase-server'

export async function GET() {
  const supabase = createServerClient()
  const { data, error } = await supabase
    .from('acct_periods')
    .select('*')
    .order('year', { ascending: false })
    .order('month', { ascending: false })
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json(data ?? [])
}

export async function POST(req: NextRequest) {
  const supabase = createServerClient()
  const body = await req.json()
  const { year, month, status, notes } = body

  if (!year || !month || !['open', 'closed'].includes(status)) {
    return NextResponse.json({ error: 'year, month and status are required' }, { status: 400 })
  }

  const lastDay = new Date(year, month, 0).getDate()
  const mm = String(month).padStart(2, '0')
  const payload = {
    year,
    month,
    start_date: `${year}-${mm}-01`,
    end_date:   `${year}-${mm}-${String(lastDay).padStart(2, '0')}`,
    status,
    notes:      notes ?? null,
    closed_at:  status === 'closed' ? new Date().toISOString() : null,
  }

  const { data, error } = await supabase
    .from('acct_periods')
    .upsert(payload, { onConflict: 'year,month' })
    .select()
    .single()

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json(data)
}
