'use server'

import { revalidatePath } from 'next/cache'
import { ApiError, adminApi } from '@/lib/api'
import type { ActionState } from '@/lib/types'

const DATE = /^\d{4}-\d{2}-\d{2}$/

function readSpend(form: FormData): { body: Record<string, unknown> } | { error: ActionState } {
  const spentOn = String(form.get('spentOn') ?? '')
  const channel = String(form.get('channel') ?? '').trim()
  const description = String(form.get('description') ?? '').trim()
  const amount = Number(String(form.get('amount') ?? '').replace(/[$,\s]/g, ''))
  const fieldErrors: Record<string, string[]> = {}
  if (!DATE.test(spentOn)) fieldErrors.spentOn = ['Choose the date it was spent.']
  if (!channel) fieldErrors.channel = ['Say where it was spent, like Google Ads.']
  if (!Number.isFinite(amount) || amount <= 0) fieldErrors.amount = ['Enter the amount, like 150 or 99.95.']
  if (Object.keys(fieldErrors).length) return { error: { error: 'Check the highlighted fields.', fieldErrors } }
  return { body: { spentOn, channel, description: description || null, amount: Math.round(amount * 100) / 100, includesGst: form.get('includesGst') === 'on' } }
}

async function run(fn: () => Promise<unknown>, message: string): Promise<ActionState> {
  try {
    await fn()
  } catch (e) {
    if (e instanceof ApiError) return { error: e.message }
    throw e
  }
  revalidatePath('/marketing')
  revalidatePath('/')
  return { ok: true, message }
}

export async function addSpend(_prev: ActionState, form: FormData): Promise<ActionState> {
  const read = readSpend(form)
  if ('error' in read) return read.error
  return run(() => adminApi('/marketing', { method: 'POST', body: read.body }), 'Added. The dashboard includes it now.')
}

export async function updateSpend(id: number, _prev: ActionState, form: FormData): Promise<ActionState> {
  const read = readSpend(form)
  if ('error' in read) return read.error
  return run(() => adminApi(`/marketing/${id}`, { method: 'PATCH', body: read.body }), 'Saved.')
}

export async function deleteSpend(id: number, _prev: ActionState, _form: FormData): Promise<ActionState> {
  return run(() => adminApi(`/marketing/${id}`, { method: 'DELETE' }), 'Deleted.')
}
