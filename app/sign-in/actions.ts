'use server'

import { cookies, headers } from 'next/headers'
import { redirect } from 'next/navigation'
import { ApiError, adminApi } from '@/lib/api'
import { COOKIE, checkCredentials, cookieOptions, rememberTeamRole, sessionValue, type Role } from '@/lib/session'

export type SignInState = { error?: string; email?: string; step?: 'email' | 'code'; message?: string }

/*
 * Failed attempts per client address. In memory, so per server instance: it
 * slows guessing down, it does not guarantee a limit. The API limits codes
 * per account on its own.
 */
const failures = new Map<string, { count: number; since: number }>()
const WINDOW_MS = 15 * 60_000
const MAX_FAILURES = 8

async function clientKey(): Promise<string> {
  return (await headers()).get('x-forwarded-for')?.split(',')[0]?.trim() || 'local'
}

function tooMany(key: string): boolean {
  const record = failures.get(key)
  return Boolean(record && Date.now() - record.since < WINDOW_MS && record.count >= MAX_FAILURES)
}

async function recordFailure(key: string): Promise<void> {
  const now = Date.now()
  const record = failures.get(key)
  const fresh = !record || now - record.since >= WINDOW_MS
  failures.set(key, { count: fresh ? 1 : record.count + 1, since: fresh ? now : record.since })
  await new Promise((r) => setTimeout(r, 400))
}

/** Only same-site paths, so the next= parameter cannot send someone elsewhere. */
function safeNext(value: unknown): string {
  const next = typeof value === 'string' ? value : ''
  return next.startsWith('/') && !next.startsWith('//') && !next.startsWith('/\\') ? next : '/'
}

/** Owner password, for the emails in ADMIN_EMAILS. */
export async function signIn(_prev: SignInState, form: FormData): Promise<SignInState> {
  const email = String(form.get('email') ?? '').trim().toLowerCase()
  const password = String(form.get('password') ?? '')
  const key = await clientKey()
  if (tooMany(key)) return { email, error: 'Too many attempts. Wait 15 minutes and try again.' }

  if (!email || !password || !checkCredentials(email, password)) {
    await recordFailure(key)
    return { email, error: 'That email and password don’t match. Check both and try again.' }
  }
  failures.delete(key)
  ;(await cookies()).set(COOKIE, sessionValue({ email, role: 'owner', via: 'password' }), cookieOptions)
  redirect(safeNext(form.get('next')))
}

/** Step 1 of a team sign-in: email a code. Answers the same whether or not the account exists. */
export async function requestCode(_prev: SignInState, form: FormData): Promise<SignInState> {
  const email = String(form.get('email') ?? '').trim().toLowerCase()
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) return { step: 'email', email, error: 'Enter your email address.' }
  const key = await clientKey()
  if (tooMany(key)) return { step: 'email', email, error: 'Too many attempts. Wait 15 minutes and try again.' }
  try {
    await adminApi('/operators/login-code', { method: 'POST', body: { email }, anonymous: true })
  } catch (e) {
    if (e instanceof ApiError) return { step: 'email', email, error: e.message }
    throw e
  }
  return { step: 'code', email, message: `If ${email} has an account, a 6-digit code is on its way. It works for 10 minutes.` }
}

/** Step 2: check the code and sign in with the account's role. */
export async function verifyCode(_prev: SignInState, form: FormData): Promise<SignInState> {
  const email = String(form.get('email') ?? '').trim().toLowerCase()
  const code = String(form.get('code') ?? '').replace(/\s/g, '')
  const key = await clientKey()
  if (tooMany(key)) return { step: 'code', email, error: 'Too many attempts. Wait 15 minutes and try again.' }
  if (!/^\d{6}$/.test(code)) return { step: 'code', email, error: 'Enter the 6 digits from the email.' }

  let role: Role
  try {
    const result = await adminApi<{ operator: { email: string; role: Role } }>('/operators/login-verify', { method: 'POST', body: { email, code }, anonymous: true })
    role = result.operator.role === 'owner' ? 'owner' : 'staff'
  } catch (e) {
    if (e instanceof ApiError) {
      await recordFailure(key)
      return { step: 'code', email, error: e.status === 401 ? 'That code is wrong or has expired. Check it, or ask for a new one.' : e.message }
    }
    throw e
  }
  failures.delete(key)
  rememberTeamRole(email, role)
  ;(await cookies()).set(COOKIE, sessionValue({ email, role, via: 'code' }), cookieOptions)
  redirect(role === 'staff' ? '/orders' : safeNext(form.get('next')))
}

export async function signOut(): Promise<void> {
  ;(await cookies()).delete(COOKIE)
  redirect('/sign-in')
}
