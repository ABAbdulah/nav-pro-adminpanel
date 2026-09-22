import 'server-only'
import crypto from 'node:crypto'
import { cookies } from 'next/headers'
import { redirect } from 'next/navigation'

/*
 * Operator sign-in.
 *
 * Two ways in:
 * - Team accounts (admin_user in the store database): an emailed six-digit code.
 *   Their role, owner or staff, comes from that account.
 * - The shared owner password, for the emails in ADMIN_EMAILS. It keeps the
 *   business owner able to get in even if email is down, and is how the first
 *   team accounts get created.
 *
 * The session is a signed cookie, not a database row: `<payload>.<signature>`,
 * where the payload holds the email, role, how they signed in and an expiry,
 * and the signature is an HMAC with SESSION_SECRET. A team account is re-checked
 * with the API about once a minute, so switching someone off takes effect
 * within a minute rather than when their cookie expires.
 */

export const COOKIE = 'pf_admin'
const LIFETIME_S = 12 * 60 * 60
const RECHECK_MS = 60_000

export type Role = 'owner' | 'staff'
export type Operator = { email: string; role: Role; via: 'password' | 'code' }

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

/** True when the email is on ADMIN_EMAILS and the owner password matches. Constant time. */
export function checkCredentials(email: string, password: string): boolean {
  const expected = process.env.ADMIN_PASSWORD ?? ''
  const passwordOk = expected.length > 0 && sameBytes(password, expected)
  const emailOk = allowedEmails().includes(email.trim().toLowerCase())
  return passwordOk && emailOk
}

export function sessionValue(operator: Operator, now = Date.now()): string {
  const payload = Buffer.from(
    JSON.stringify({ e: operator.email.trim().toLowerCase(), r: operator.role, v: operator.via, x: Math.floor(now / 1000) + LIFETIME_S }),
  ).toString('base64url')
  return `${payload}.${sign(payload)}`
}

/** Decode and verify a cookie. Does not check a team account is still active. */
export function readSession(value: string | undefined): Operator | null {
  if (!value) return null
  const [payload, signature] = value.split('.')
  if (!payload || !signature || !sameBytes(signature, sign(payload))) return null
  try {
    const data = JSON.parse(Buffer.from(payload, 'base64url').toString()) as { e?: string; r?: string; v?: string; x?: number }
    if (!data.e || !data.x || data.x * 1000 < Date.now()) return null
    const via = data.v === 'code' ? 'code' : 'password'
    // Password sessions: taking someone off ADMIN_EMAILS signs them out at once.
    if (via === 'password' && !allowedEmails().includes(data.e)) return null
    return { email: data.e, role: data.r === 'staff' ? 'staff' : 'owner', via }
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

// Per server instance: email -> when it was last confirmed active, and as what.
const confirmed = new Map<string, { at: number; role: Role | null }>()

/** Ask the store API whether a team account is still active, and its current role. */
async function teamRole(email: string): Promise<Role | null> {
  const hit = confirmed.get(email)
  if (hit && Date.now() - hit.at < RECHECK_MS) return hit.role
  const url = process.env.ADMIN_API_URL?.trim().replace(/\/+$/, '')
  const token = process.env.ADMIN_TOKEN?.trim()
  if (!url || !token) return hit?.role ?? null
  try {
    const res = await fetch(`${url}/api/admin/operators/check?email=${encodeURIComponent(email)}`, {
      headers: { authorization: `Bearer ${token}` },
      cache: 'no-store',
      signal: AbortSignal.timeout(10_000),
    })
    if (!res.ok) return hit?.role ?? null
    const data = (await res.json()) as { active: boolean; operator?: { role: Role } }
    const role = data.active ? (data.operator?.role === 'owner' ? 'owner' : 'staff') : null
    confirmed.set(email, { at: Date.now(), role })
    return role
  } catch {
    // The API being briefly unreachable must not sign everyone out; the next
    // page's data call fails loudly on its own.
    return hit?.role ?? null
  }
}

export async function currentOperator(): Promise<Operator | null> {
  const session = readSession((await cookies()).get(COOKIE)?.value)
  if (!session || session.via === 'password') return session
  const role = await teamRole(session.email)
  return role ? { ...session, role } : null
}

/** For pages and server actions: the signed-in operator, or off to sign in. */
export async function requireOperator(): Promise<Operator> {
  const operator = await currentOperator()
  if (!operator) redirect('/sign-in')
  return operator
}

/** For owner-only pages and actions: staff are sent to the orders list. */
export async function requireOwner(): Promise<Operator> {
  const operator = await requireOperator()
  if (operator.role !== 'owner') redirect('/orders')
  return operator
}

/** After a sign-in, trust the role the API just gave for a minute. */
export function rememberTeamRole(email: string, role: Role): void {
  confirmed.set(email, { at: Date.now(), role })
}
