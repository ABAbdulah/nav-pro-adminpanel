'use server'

import { revalidatePath } from 'next/cache'
import { ApiError, adminApi } from '@/lib/api'
import { requireOwner } from '@/lib/session'
import type { ActionState } from '@/lib/types'

const num = (form: FormData, name: string) => Number(String(form.get(name) ?? '').replace(/[$%\s]/g, ''))

async function save(key: string, value: unknown, message: string): Promise<ActionState> {
  try {
    await adminApi(`/settings/${key}`, { method: 'PUT', body: { value } })
  } catch (e) {
    if (e instanceof ApiError) return { error: e.status === 400 ? 'Check the values: percentages from 0 to 20, fixed fees from $0 to $10.' : e.message }
    throw e
  }
  revalidatePath('/settings')
  revalidatePath('/')
  return { ok: true, message }
}

export async function saveFees(_prev: ActionState, form: FormData): Promise<ActionState> {
  await requireOwner()
  const value = {
    stripe: { pct: num(form, 'stripePct'), fixed: num(form, 'stripeFixed') },
    paypal: { pct: num(form, 'paypalPct'), fixed: num(form, 'paypalFixed') },
  }
  if (Object.values(value).some((f) => !Number.isFinite(f.pct) || !Number.isFinite(f.fixed))) return { error: 'Enter every fee as a number.' }
  return save('payment_fees', value, 'Fee rates saved. Profit figures use them now.')
}

export async function saveAlerts(_prev: ActionState, form: FormData): Promise<ActionState> {
  await requireOwner()
  const emails = [...new Set(String(form.get('emails') ?? '').split(/[\s,;]+/).map((e) => e.trim().toLowerCase()).filter(Boolean))]
  const bad = emails.find((e) => !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(e))
  if (bad) return { error: `“${bad}” isn’t an email address.` }
  if (emails.length > 10) return { error: 'Up to 10 addresses.' }
  return save('order_alert_emails', emails, emails.length ? `Saved. ${emails.length === 1 ? 'That address hears' : 'Those addresses hear'} about every new paid order.` : 'Saved. Nobody is emailed about new orders.')
}
