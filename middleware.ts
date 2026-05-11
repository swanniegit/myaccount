import { timingSafeEqual, createHmac } from 'crypto'
import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'

function expectedToken() {
  return createHmac('sha256', process.env.SITE_PASSWORD!)
    .update('authenticated')
    .digest('hex')
}

function validSession(request: NextRequest) {
  const token = request.cookies.get('session')?.value
  if (!token) return false
  const expected = expectedToken()
  try {
    return timingSafeEqual(Buffer.from(token), Buffer.from(expected))
  } catch {
    return false
  }
}

export function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl

  if (pathname.startsWith('/auth')) {
    if (validSession(request)) {
      return NextResponse.redirect(new URL('/dashboard', request.url))
    }
    return NextResponse.next()
  }

  if (!validSession(request)) {
    return NextResponse.redirect(new URL('/auth/login', request.url))
  }

  return NextResponse.next()
}

export const config = {
  matcher: ['/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)'],
}
