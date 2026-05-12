import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'

async function hmacHex(key: string, message: string): Promise<string> {
  const enc = new TextEncoder()
  const cryptoKey = await globalThis.crypto.subtle.importKey(
    'raw', enc.encode(key), { name: 'HMAC', hash: 'SHA-256' }, false, ['sign']
  )
  const sig = await globalThis.crypto.subtle.sign('HMAC', cryptoKey, enc.encode(message))
  return Array.from(new Uint8Array(sig))
    .map(b => b.toString(16).padStart(2, '0'))
    .join('')
}

async function validSession(request: NextRequest): Promise<boolean> {
  const token = request.cookies.get('session')?.value
  if (!token) return false
  const expected = await hmacHex(process.env.SITE_PASSWORD!, 'authenticated')
  if (token.length !== expected.length) return false
  let diff = 0
  for (let i = 0; i < token.length; i++) {
    diff |= token.charCodeAt(i) ^ expected.charCodeAt(i)
  }
  return diff === 0
}

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl

  if (pathname.startsWith('/api/push')) {
    return NextResponse.next()
  }

  if (pathname.startsWith('/auth') || pathname.startsWith('/api/auth')) {
    if (pathname.startsWith('/api/auth')) return NextResponse.next()
    if (await validSession(request)) {
      return NextResponse.redirect(new URL('/dashboard', request.url))
    }
    return NextResponse.next()
  }

  if (!await validSession(request)) {
    return NextResponse.redirect(new URL('/auth/login', request.url))
  }

  return NextResponse.next()
}

export const config = {
  matcher: ['/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)'],
}
