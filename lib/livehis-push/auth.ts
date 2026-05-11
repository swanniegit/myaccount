import { NextRequest, NextResponse } from 'next/server'

export function requireApiKey(req: NextRequest): NextResponse | null {
  const expected = process.env.ACCOUNTING_API_KEY
  if (!expected) return null // key not configured — open (dev)

  const provided = req.headers.get('x-api-key') ?? req.headers.get('X-Api-Key') ?? ''
  if (provided !== expected) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }
  return null
}
