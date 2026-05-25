import { NextRequest, NextResponse } from 'next/server'
import { createServerClient, getRequestUser } from '@/lib/supabase-server'
import { runYearEndClose } from '@/lib/year-end/close'

// POST /api/year-end/close
// Body: { fiscal_year: number }
// Auth: Supabase session JWT in Authorization: Bearer <token>
export async function POST(req: NextRequest) {
  const user = await getRequestUser(req)
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  let body: { fiscal_year: number }
  try { body = await req.json() } catch {
    return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 })
  }

  const { fiscal_year } = body
  if (!fiscal_year || !Number.isInteger(fiscal_year)) {
    return NextResponse.json({ error: 'Missing or invalid fiscal_year' }, { status: 400 })
  }

  const supabase = createServerClient()

  try {
    const result = await runYearEndClose(supabase, fiscal_year)
    return NextResponse.json({ success: true, ...result })
  } catch (err) {
    return NextResponse.json({ error: (err as Error).message }, { status: 422 })
  }
}
