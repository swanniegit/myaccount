import { timingSafeEqual } from 'crypto'
import { NextRequest, NextResponse } from 'next/server'

export function requireApiKey(req: NextRequest): NextResponse | null {
  const expected = process.env.ACCOUNTING_API_KEY
  if (!expected) {
    if (process.env.NODE_ENV === 'production') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }
    return null // key not configured — open (dev only)
  }

  const provided = req.headers.get('x-api-key') ?? req.headers.get('X-Api-Key') ?? ''
  let match = false
  try {
    match = provided.length === expected.length &&
      timingSafeEqual(Buffer.from(provided), Buffer.from(expected))
  } catch {
    match = false
  }
  if (!match) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }
  return null
}
