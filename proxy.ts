import { NextResponse, type NextRequest } from 'next/server'

/*
 * Optimistic gate: a visitor with no session cookie goes straight to sign-in
 * instead of loading a page first. This is not the security check - the cookie
 * could be forged here. Every page and server action verifies the signature
 * with requireOperator() before touching data.
 */
export function proxy(request: NextRequest) {
  if (request.cookies.has('pf_admin')) return NextResponse.next()
  const url = request.nextUrl.clone()
  url.pathname = '/sign-in'
  url.search = request.nextUrl.pathname === '/' ? '' : `?next=${encodeURIComponent(request.nextUrl.pathname + request.nextUrl.search)}`
  return NextResponse.redirect(url)
}

export const config = {
  matcher: ['/((?!sign-in|_next/static|_next/image|favicon.ico|icon.svg|robots.txt).*)'],
}
