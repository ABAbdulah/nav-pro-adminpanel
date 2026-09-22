'use server'

import { revalidatePath } from 'next/cache'
import { ApiError, adminApi } from '@/lib/api'
import { requireOwner } from '@/lib/session'
import type { ActionState } from '@/lib/types'

const text = (form: FormData, name: string) => String(form.get(name) ?? '').trim()

function readRule(form: FormData): { body: Record<string, unknown> } | { error: ActionState } {
  const markup = Number(text(form, 'markup').replace(/[%\s]/g, ''))
  const priority = Number(text(form, 'priority') || '0')
  if (!Number.isFinite(markup) || markup < 0 || markup > 1000) return { error: { error: 'Enter the markup as a percentage, like 40.', fieldErrors: { markup: ['A percentage from 0 to 1000.'] } } }
  if (!Number.isInteger(priority)) return { error: { error: 'Priority is a whole number.', fieldErrors: { priority: ['A whole number.'] } } }
  return { body: { brand: text(form, 'brand').toUpperCase() || null, markupPct: markup, priority } }
}

async function run(fn: () => Promise<unknown>, message: string): Promise<ActionState> {
  try {
    await fn()
  } catch (e) {
    if (e instanceof ApiError) return { error: e.message }
    throw e
  }
  revalidatePath('/pricing')
  return { ok: true, message }
}

export async function addRule(_prev: ActionState, form: FormData): Promise<ActionState> {
  await requireOwner()
  const read = readRule(form)
  if ('error' in read) return read.error
  return run(() => adminApi('/price-rules', { method: 'POST', body: read.body }), 'Rule added. Prices update on the store within a minute.')
}

export async function updateRule(id: number, _prev: ActionState, form: FormData): Promise<ActionState> {
  await requireOwner()
  const read = readRule(form)
  if ('error' in read) return read.error
  return run(() => adminApi(`/price-rules/${id}`, { method: 'PATCH', body: read.body }), 'Rule saved. Prices update on the store within a minute.')
}

export async function deleteRule(id: number, _prev: ActionState, _form: FormData): Promise<ActionState> {
  await requireOwner()
  return run(() => adminApi(`/price-rules/${id}`, { method: 'DELETE' }), 'Rule deleted.')
}
