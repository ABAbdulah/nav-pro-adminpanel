import 'server-only'
import { requireOperator } from './session'
import type { ActionState } from './types'

/*
 * The only way this panel reaches data: the store's /api/admin/* over HTTPS,
 * with ADMIN_TOKEN, from the server. The token never reaches a browser, and
 * every request names the signed-in operator and their role, so the API can
 * record who changed what and keep cost figures from staff.
 */

export class ApiError extends Error {
  constructor(public status: number, message: string, public details?: unknown) {
    super(message)
  }
}

/*
 * Setup mistakes are reported as ApiError so the page names the setting to fix.
 * The messages name variables, never their values.
 */
function base(): string {
  const url = process.env.ADMIN_API_URL?.trim()
  if (!url) throw new ApiError(0, 'The panel’s ADMIN_API_URL setting is empty. Set it to the store API address, e.g. https://nav-pro-listing-production.up.railway.app, and redeploy.')
  if (!/^https?:\/\/[^/\s]+/i.test(url)) throw new ApiError(0, 'The panel’s ADMIN_API_URL setting is not a web address. It must start with https:// (e.g. https://nav-pro-listing-production.up.railway.app). Fix it and redeploy.')
  return url.replace(/\/+$/, '').replace(/\/api$/, '')
}

type Options = {
  method?: 'GET' | 'POST' | 'PATCH' | 'PUT' | 'DELETE'
  body?: unknown
  query?: Record<string, string | number | undefined | null>
  // Raw bytes (a photo upload) instead of a JSON body.
  raw?: { data: ArrayBuffer; contentType: string }
  // Only for signing in, before there is an operator to name.
  anonymous?: boolean
}

export async function adminApi<T>(path: string, { method = 'GET', body, query, raw, anonymous = false }: Options = {}): Promise<T> {
  const operator = anonymous ? null : await requireOperator()
  const token = process.env.ADMIN_TOKEN?.trim()
  if (!token) throw new ApiError(0, 'The panel’s ADMIN_TOKEN setting is empty. Copy ADMIN_TOKEN from the nav-pro-listing service on Railway into Vercel and redeploy.')

  const url = new URL(`${base()}/api/admin${path}`)
  for (const [key, value] of Object.entries(query ?? {})) {
    if (value !== undefined && value !== null && value !== '') url.searchParams.set(key, String(value))
  }

  let response: Response
  try {
    response = await fetch(url, {
      method,
      headers: {
        authorization: `Bearer ${token}`,
        ...(operator ? { 'x-admin-actor': operator.email, 'x-admin-role': operator.role } : {}),
        ...(raw ? { 'content-type': raw.contentType } : body !== undefined ? { 'content-type': 'application/json' } : {}),
      },
      body: raw ? raw.data : body === undefined ? undefined : JSON.stringify(body),
      // Admin data is always current: never cached between requests.
      cache: 'no-store',
      signal: AbortSignal.timeout(raw ? 60_000 : 30_000),
    })
  } catch {
    throw new ApiError(0, 'The store API could not be reached. Check your connection and try again.')
  }

  const data = await response.json().catch(() => null)
  if (!response.ok) {
    const message =
      response.status === 401 ? 'The panel’s API token was refused. Check ADMIN_TOKEN matches the API.' :
      response.status === 503 && !data?.error ? 'The admin API is switched off on the server (ADMIN_TOKEN is not set there).' :
      (data?.error as string | undefined) ?? `The store API answered ${response.status}.`
    throw new ApiError(response.status, message, data?.details)
  }
  // A 200 that is not JSON is some other website: the address is wrong.
  if (data === null) throw new ApiError(0, 'ADMIN_API_URL does not point at the store API (the answer was not API data). Set it to https://nav-pro-listing-production.up.railway.app and redeploy.')
  return data as T
}

export type { ActionState } from './types'

/** Run an API call in a server action and turn failures into a message for the form. */
export async function attempt(fn: () => Promise<unknown>, success: string): Promise<ActionState> {
  try {
    await fn()
    return { ok: true, message: success }
  } catch (e) {
    if (e instanceof ApiError) {
      const details = e.details as { fieldErrors?: Record<string, string[]> } | undefined
      return { error: e.message, fieldErrors: details?.fieldErrors }
    }
    // redirect() and notFound() work by throwing; let them through.
    throw e
  }
}
