import { createHmac, timingSafeEqual } from 'crypto'
import { NextResponse } from 'next/server'

export async function POST(request: Request) {
  const { password } = await request.json()

  const expected = process.env.SITE_PASSWORD!
  let match = false
  try {
    match = timingSafeEqual(Buffer.from(password ?? ''), Buffer.from(expected))
  } catch {
    match = false
  }

  if (!match) {
    return NextResponse.json({ error: 'Invalid password' }, { status: 401 })
  }

  const token = createHmac('sha256', expected).update('authenticated').digest('hex')
  const response = NextResponse.json({ ok: true })
  response.cookies.set('session', token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    maxAge: 60 * 60 * 24 * 30,
    path: '/',
  })

  return response
}
