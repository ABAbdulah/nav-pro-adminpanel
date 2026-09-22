'use server'

import { revalidatePath } from 'next/cache'
import { ApiError, adminApi } from '@/lib/api'
import { requireOwner } from '@/lib/session'
import type { ActionState } from '@/lib/types'

const text = (form: FormData, name: string) => {
  const value = form.get(name)
  return typeof value === 'string' ? value.trim() : ''
}

/**
 * Save the product form. Every field is sent: an empty one means "use the
 * supplier's" (or the normal price, or the automatic show/hide rule), which the
 * API stores as no override. Fields that did not change are not recorded as
 * changes.
 */
export async function saveProduct(id: number, _prev: ActionState, form: FormData): Promise<ActionState> {
  await requireOwner()
  const body: Record<string, unknown> = {
    title: text(form, 'title') || null,
    description: text(form, 'description') || null,
    imageUrl: text(form, 'imageUrl') || null,
    notes: text(form, 'notes') || null,
  }

  const priceMode = text(form, 'priceMode')
  if (priceMode === 'custom') {
    const price = Number(text(form, 'price').replace(/[$,\s]/g, ''))
    if (!Number.isFinite(price) || price <= 0) return { error: 'Enter the price as a number, like 49.95.', fieldErrors: { sellIncGst: ['Enter a price above $0.'] } }
    body.sellIncGst = Math.round(price * 100) / 100
  } else {
    body.sellIncGst = null
  }

  const visibility = text(form, 'visibility')
  body.isPublished = visibility === 'show' ? true : visibility === 'hide' ? false : null

  // The override's timestamp when the form was loaded, so a save cannot
  // silently undo someone else's change made in the meantime.
  if (form.has('ifUnchangedSince')) body.ifUnchangedSince = text(form, 'ifUnchangedSince') || null

  // Photos uploaded here live on the API's own host in development (http).
  if (body.imageUrl && !/^https?:\/\//i.test(String(body.imageUrl))) {
    return { error: 'The photo link must start with https://', fieldErrors: { imageUrl: ['Use a link that starts with https://'] } }
  }

  try {
    await adminApi(`/products/${id}`, { method: 'PATCH', body })
  } catch (e) {
    if (e instanceof ApiError) {
      const details = e.details as { fieldErrors?: Record<string, string[]> } | undefined
      return {
        source: e.status === 409 ? 'conflict' : undefined,
        error: e.status === 400 ? 'Some of the details aren’t valid. Check the highlighted fields.' : e.message,
        fieldErrors: details?.fieldErrors,
      }
    }
    throw e
  }

  revalidatePath(`/products/${id}`)
  revalidatePath('/products')
  return { ok: true, message: 'Saved. The storefront shows the change within a minute.' }
}

const PHOTO_TYPES = ['image/jpeg', 'image/png', 'image/webp']

/** Upload a photo (already shrunk in the browser) and make it the product's photo. */
export async function uploadPhoto(id: number, form: FormData): Promise<ActionState & { imageUrl?: string; updatedAt?: string | null }> {
  await requireOwner()
  const file = form.get('photo')
  if (!(file instanceof File) || file.size === 0) return { error: 'Choose a photo first.' }
  if (!PHOTO_TYPES.includes(file.type)) return { error: 'Use a JPEG, PNG or WebP photo.' }
  if (file.size > 6 * 1024 * 1024) return { error: 'That photo is too large. Use one under 6 MB.' }
  try {
    const result = await adminApi<{ imageUrl: string; product: { override: { updatedAt: string | null } } }>(`/products/${id}/image`, {
      method: 'POST',
      raw: { data: await file.arrayBuffer(), contentType: file.type },
    })
    revalidatePath(`/products/${id}`)
    revalidatePath('/products')
    return { ok: true, message: 'Photo uploaded. The storefront shows it within a minute.', imageUrl: result.imageUrl, updatedAt: result.product.override.updatedAt }
  } catch (e) {
    if (e instanceof ApiError) return { error: e.message }
    throw e
  }
}

/** Record how many we hold ourselves, or stop tracking it. */
export async function saveStock(id: number, _prev: ActionState, form: FormData): Promise<ActionState> {
  await requireOwner()
  const stop = form.get('stop') === '1'
  const raw = text(form, 'qty')
  if (!stop && !/^\d+$/.test(raw)) {
    return { error: 'Enter how many you hold, as a whole number (0 or more).', fieldErrors: { qty: ['A whole number, 0 or more.'] } }
  }
  try {
    await adminApi(`/products/${id}/stock`, { method: 'PUT', body: { qty: stop ? null : Number(raw), location: text(form, 'location') || null } })
  } catch (e) {
    if (e instanceof ApiError) return { error: e.message }
    throw e
  }
  revalidatePath(`/products/${id}`)
  revalidatePath('/products')
  return { ok: true, message: stop ? 'Stopped tracking our stock of this part.' : 'Stock saved.' }
}

const BULK_ACTIONS = ['hide', 'show', 'auto', 'resetPrice', 'setPrice', 'adjustPrice'] as const

/** One change for every product ticked on the list. */
export async function bulkProducts(_prev: ActionState, form: FormData): Promise<ActionState> {
  await requireOwner()
  const ids = [...new Set(form.getAll('ids').map((v) => Number(v)).filter((n) => Number.isSafeInteger(n) && n > 0))]
  const action = text(form, 'action') as (typeof BULK_ACTIONS)[number]
  if (ids.length === 0) return { error: 'Tick at least one product first.' }
  if (!BULK_ACTIONS.includes(action)) return { error: 'Choose what to do with them.' }
  const body: Record<string, unknown> = { action, ids }
  const value = Number(text(form, 'value').replace(/[$,%\s]/g, ''))
  if (action === 'setPrice') {
    if (!Number.isFinite(value) || value <= 0) return { error: 'Enter the new price, like 49.95.' }
    body.priceIncGst = Math.round(value * 100) / 100
  }
  if (action === 'adjustPrice') {
    if (!Number.isFinite(value) || value === 0 || value < -90 || value > 500) return { error: 'Enter a percentage, like 10 to raise prices or -5 to lower them.' }
    body.percent = value
  }
  try {
    const result = await adminApi<{ changed: number; skipped: { id: number; reason: string }[] }>('/products/bulk', { method: 'POST', body })
    revalidatePath('/products')
    const skipped = result.skipped.length ? ` ${result.skipped.length} skipped (no current price or not a product).` : ''
    return { ok: true, message: `Changed ${result.changed} product${result.changed === 1 ? '' : 's'}. The storefront updates within a minute.${skipped}` }
  } catch (e) {
    if (e instanceof ApiError) return { error: e.message }
    throw e
  }
}
