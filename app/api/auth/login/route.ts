import { createHmac, randomBytes, timingSafeEqual } from 'crypto'
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

  // SESSION_SECRET decouples session signing from the login password.
  // Set SESSION_SECRET to a random value (e.g. openssl rand -hex 32) in .env.local.
  // SITE_PASSWORD is always included so rotating it immediately revokes all sessions.
  const secret = (process.env.SESSION_SECRET ?? '') + process.env.SITE_PASSWORD!
  const nonce = randomBytes(32).toString('hex')
  const sig = createHmac('sha256', secret).update(nonce).digest('hex')
  const token = `${nonce}.${sig}`

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
