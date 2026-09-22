'use server'

import { cookies, headers } from 'next/headers'
import { redirect } from 'next/navigation'
import { COOKIE, checkCredentials, cookieOptions, sessionValue } from '@/lib/session'

export type SignInState = { error?: string; email?: string }

/*
 * Failed attempts per client address. In memory, so per server instance: it
 * slows guessing down, it does not guarantee a limit. The password itself
 * should be long (see .env.example).
 */
const failures = new Map<string, { count: number; since: number }>()
const WINDOW_MS = 15 * 60_000
const MAX_FAILURES = 8

/** Only same-site paths, so the next= parameter cannot send someone elsewhere. */
function safeNext(value: unknown): string {
  const next = typeof value === 'string' ? value : ''
  return next.startsWith('/') && !next.startsWith('//') && !next.startsWith('/\\') ? next : '/'
}

export async function signIn(_prev: SignInState, form: FormData): Promise<SignInState> {
  const email = String(form.get('email') ?? '').trim().toLowerCase()
  const password = String(form.get('password') ?? '')
  const ip = (await headers()).get('x-forwarded-for')?.split(',')[0]?.trim() || 'local'

  const now = Date.now()
  const record = failures.get(ip)
  if (record && now - record.since < WINDOW_MS && record.count >= MAX_FAILURES) {
    return { email, error: 'Too many attempts. Wait 15 minutes and try again.' }
  }

  if (!email || !password || !checkCredentials(email, password)) {
    const fresh = !record || now - record.since >= WINDOW_MS
    failures.set(ip, { count: fresh ? 1 : record.count + 1, since: fresh ? now : record.since })
    await new Promise((r) => setTimeout(r, 400))
    return { email, error: 'That email and password don’t match. Check both and try again.' }
  }

  failures.delete(ip)
  ;(await cookies()).set(COOKIE, sessionValue(email), cookieOptions)
  redirect(safeNext(form.get('next')))
}

export async function signOut(): Promise<void> {
  ;(await cookies()).delete(COOKIE)
  redirect('/sign-in')
}
