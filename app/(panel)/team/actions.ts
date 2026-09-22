'use server'

import { revalidatePath } from 'next/cache'
import { ApiError, adminApi } from '@/lib/api'
import { requireOwner } from '@/lib/session'
import type { ActionState } from '@/lib/types'

const text = (form: FormData, name: string) => String(form.get(name) ?? '').trim()

async function run(fn: () => Promise<unknown>, message: string): Promise<ActionState> {
  try {
    await fn()
  } catch (e) {
    if (e instanceof ApiError) return { error: e.message }
    throw e
  }
  revalidatePath('/team')
  return { ok: true, message }
}

export async function addMember(_prev: ActionState, form: FormData): Promise<ActionState> {
  await requireOwner()
  const email = text(form, 'email').toLowerCase()
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) return { error: 'Enter their email address.', fieldErrors: { email: ['A full email address.'] } }
  const role = text(form, 'role') === 'owner' ? 'owner' : 'staff'
  return run(
    () => adminApi('/operators', { method: 'POST', body: { email, name: text(form, 'name') || null, role } }),
    `Added. ${email} can now sign in with a code sent to that address.`,
  )
}

export async function updateMember(id: number, _prev: ActionState, form: FormData): Promise<ActionState> {
  await requireOwner()
  const body: Record<string, unknown> = {}
  if (form.has('role')) body.role = text(form, 'role') === 'owner' ? 'owner' : 'staff'
  if (form.has('active')) body.isActive = text(form, 'active') === 'yes'
  if (form.has('name')) body.name = text(form, 'name') || null
  return run(() => adminApi(`/operators/${id}`, { method: 'PATCH', body }), 'Saved. It takes effect within a minute.')
}
