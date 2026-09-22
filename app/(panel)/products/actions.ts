'use server'

import { revalidatePath } from 'next/cache'
import { ApiError, adminApi } from '@/lib/api'
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

  if (body.imageUrl && !/^https:\/\//i.test(String(body.imageUrl))) {
    return { error: 'The photo link must start with https://', fieldErrors: { imageUrl: ['Use a link that starts with https://'] } }
  }

  try {
    await adminApi(`/products/${id}`, { method: 'PATCH', body })
  } catch (e) {
    if (e instanceof ApiError) {
      const details = e.details as { fieldErrors?: Record<string, string[]> } | undefined
      return { error: e.status === 400 ? 'Some of the details aren’t valid. Check the highlighted fields.' : e.message, fieldErrors: details?.fieldErrors }
    }
    throw e
  }

  revalidatePath(`/products/${id}`)
  revalidatePath('/products')
  return { ok: true, message: 'Saved. The storefront shows the change within a minute.' }
}
