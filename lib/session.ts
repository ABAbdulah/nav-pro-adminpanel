import 'server-only'
import crypto from 'node:crypto'
import { cookies } from 'next/headers'
import { redirect } from 'next/navigation'

/*
 * Operator sign-in, phase 1: an allow-listed email plus one shared password.
 *
 * The session is a signed cookie, not a database row: `<payload>.<signature>`,
 * where the payload is the email and an expiry and the signature is an HMAC with
 * SESSION_SECRET. Nothing in it is secret; the signature is what stops anyone
 * writing their own. The email is what the store API records against changes.
 *
 * Per-person accounts replace this in phase 4 (docs/plan.md).
 */

export const COOKIE = 'pf_admin'
const LIFETIME_S = 12 * 60 * 60

export type Operator = { email: string }

function secret(): Buffer {
  const value = process.env.SESSION_SECRET ?? ''
  // Fail closed: a short or missing secret would make the cookie forgeable.
  if (value.length < 32) throw new Error('SESSION_SECRET must be set to at least 32 characters')
  return Buffer.from(value)
}

const sign = (payload: string) => crypto.createHmac('sha256', secret()).update(payload).digest('base64url')

function sameBytes(a: string, b: string): boolean {
  // Hash first so the comparison is constant time whatever the lengths.
  const ha = crypto.createHash('sha256').update(a).digest()
  const hb = crypto.createHash('sha256').update(b).digest()
  return crypto.timingSafeEqual(ha, hb)
}

export function allowedEmails(): string[] {
  return (process.env.ADMIN_EMAILS ?? '')
    .split(',')
    .map((e) => e.trim().toLowerCase())
    .filter(Boolean)
}

/** True when the email is allowed in and the password matches. Constant time. */
export function checkCredentials(email: string, password: string): boolean {
  const expected = process.env.ADMIN_PASSWORD ?? ''
  const passwordOk = expected.length > 0 && sameBytes(password, expected)
  const emailOk = allowedEmails().includes(email.trim().toLowerCase())
  return passwordOk && emailOk
}

export function sessionValue(email: string, now = Date.now()): string {
  const payload = Buffer.from(JSON.stringify({ e: email.trim().toLowerCase(), x: Math.floor(now / 1000) + LIFETIME_S })).toString('base64url')
  return `${payload}.${sign(payload)}`
}

export function readSession(value: string | undefined): Operator | null {
  if (!value) return null
  const [payload, signature] = value.split('.')
  if (!payload || !signature || !sameBytes(signature, sign(payload))) return null
  try {
    const data = JSON.parse(Buffer.from(payload, 'base64url').toString()) as { e?: string; x?: number }
    if (!data.e || !data.x || data.x * 1000 < Date.now()) return null
    // Taking someone off ADMIN_EMAILS signs them out on their next request.
    if (!allowedEmails().includes(data.e)) return null
    return { email: data.e }
  } catch {
    return null
  }
}

export const cookieOptions = {
  httpOnly: true,
  secure: process.env.NODE_ENV === 'production',
  sameSite: 'lax' as const,
  path: '/',
  maxAge: LIFETIME_S,
}

export async function currentOperator(): Promise<Operator | null> {
  return readSession((await cookies()).get(COOKIE)?.value)
}

/** For pages and server actions: the signed-in operator, or off to sign in. */
export async function requireOperator(): Promise<Operator> {
  const operator = await currentOperator()
  if (!operator) redirect('/sign-in')
  return operator
}
