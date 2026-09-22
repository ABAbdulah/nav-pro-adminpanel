'use server'

import { revalidatePath } from 'next/cache'
import { ApiError, adminApi } from '@/lib/api'
import { requireOwner } from '@/lib/session'
import type { ActionState } from '@/lib/types'

const STATES = ['NSW', 'VIC', 'QLD', 'SA', 'WA', 'TAS', 'NT', 'ACT']

const text = (form: FormData, name: string) => String(form.get(name) ?? '').trim()
const amount = (value: string) => Number(value.replace(/[$,\s]/g, ''))

async function run(fn: () => Promise<unknown>, message: string): Promise<ActionState> {
  try {
    await fn()
  } catch (e) {
    if (e instanceof ApiError) return { error: e.message }
    throw e
  }
  revalidatePath('/shipping')
  return { ok: true, message }
}

export async function saveZone(id: number | null, _prev: ActionState, form: FormData): Promise<ActionState> {
  await requireOwner()
  const name = text(form, 'name')
  const everywhere = form.get('everywhere') === 'on'
  const states = STATES.filter((s) => form.get(`state-${s}`) === 'on')
  const from = text(form, 'postcodeFrom')
  const to = text(form, 'postcodeTo')
  const fieldErrors: Record<string, string[]> = {}
  if (!name) fieldErrors.name = ['Give the area a name, like "Sydney metro".']
  if (!everywhere && states.length === 0) fieldErrors.states = ['Tick at least one state, or "All of Australia".']
  if ((from && !/^\d{4}$/.test(from)) || (to && !/^\d{4}$/.test(to))) fieldErrors.postcode = ['Postcodes are 4 digits.']
  if ((from && !to) || (!from && to)) fieldErrors.postcode = ['Enter both ends of the postcode range, or neither.']
  if (from && to && from > to) fieldErrors.postcode = ['The first postcode must be lower than the second.']
  if (Object.keys(fieldErrors).length) return { error: 'Check the highlighted fields.', fieldErrors }

  const body = {
    name,
    states: everywhere ? null : states,
    postcodeFrom: from || null,
    postcodeTo: to || null,
    priority: Number(text(form, 'priority')) || 0,
    isActive: form.get('isActive') === 'on',
  }
  return run(
    () => (id ? adminApi(`/shipping/zones/${id}`, { method: 'PATCH', body }) : adminApi('/shipping/zones', { method: 'POST', body })),
    id ? 'Delivery area saved.' : 'Delivery area added. Now add at least one delivery option to it.',
  )
}

export async function deleteZone(id: number, _prev: ActionState, _form: FormData): Promise<ActionState> {
  await requireOwner()
  return run(() => adminApi(`/shipping/zones/${id}`, { method: 'DELETE' }), 'Delivery area deleted.')
}

export async function saveRate(id: number | null, zoneId: number, _prev: ActionState, form: FormData): Promise<ActionState> {
  await requireOwner()
  const name = text(form, 'name')
  const price = amount(text(form, 'price'))
  const freeOverText = text(form, 'freeOver')
  const freeOver = freeOverText ? amount(freeOverText) : null
  const fieldErrors: Record<string, string[]> = {}
  if (!name) fieldErrors.name = ['Name the option, like "Standard" or "Express".']
  if (!Number.isFinite(price) || price < 0) fieldErrors.price = ['Enter what the customer pays, like 12.95 (0 for free).']
  if (freeOver !== null && (!Number.isFinite(freeOver) || freeOver < 0)) fieldErrors.freeOver = ['Enter an order total, like 150, or leave it empty.']
  if (Object.keys(fieldErrors).length) return { error: 'Check the highlighted fields.', fieldErrors }

  const body = {
    zoneId,
    name,
    priceIncGst: Math.round(price * 100) / 100,
    freeOverIncGst: freeOver === null ? null : Math.round(freeOver * 100) / 100,
    etaText: text(form, 'eta') || null,
    priority: Number(text(form, 'priority')) || 0,
    isActive: form.get('isActive') === 'on',
  }
  return run(
    () => (id ? adminApi(`/shipping/rates/${id}`, { method: 'PATCH', body }) : adminApi('/shipping/rates', { method: 'POST', body })),
    id ? 'Delivery option saved.' : 'Delivery option added.',
  )
}

export async function deleteRate(id: number, _prev: ActionState, _form: FormData): Promise<ActionState> {
  await requireOwner()
  return run(() => adminApi(`/shipping/rates/${id}`, { method: 'DELETE' }), 'Delivery option deleted.')
}
