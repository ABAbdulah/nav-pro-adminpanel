'use server'

import { revalidatePath } from 'next/cache'
import { ApiError, adminApi } from '@/lib/api'
import { requireOwner } from '@/lib/session'
import type { ActionState } from '@/lib/types'

/** Undo one product edit (the API refuses if it has been changed again since). */
export async function revertChange(id: number, _prev: ActionState, _form: FormData): Promise<ActionState> {
  await requireOwner()
  try {
    const result = await adminApi<{ partId: number }>(`/audit/${id}/revert`, { method: 'POST' })
    revalidatePath('/history')
    revalidatePath(`/products/${result.partId}`)
    return { ok: true, message: 'Undone. The storefront updates within a minute.' }
  } catch (e) {
    if (e instanceof ApiError) return { error: e.message }
    throw e
  }
}
