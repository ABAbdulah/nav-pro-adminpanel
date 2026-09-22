'use client'

import { useActionState } from 'react'
import { createPost } from '@/app/(panel)/blog/actions'
import type { ActionState } from '@/lib/types'
import { FormMessage, SubmitButton } from '@/components/forms'
import { Input } from '@/components/ui/input'

export function NewPost() {
  const [state, action] = useActionState<ActionState, FormData>(createPost, {})
  return (
    <form action={action} className="grid gap-3 sm:grid-cols-[minmax(0,1fr)_auto] sm:items-end">
      <div>
        <label htmlFor="new-title" className="field-label">Title</label>
        <Input id="new-title" name="title" placeholder="e.g. How to choose the right engine oil" maxLength={200} />
      </div>
      <SubmitButton pendingLabel="Creating…">Start writing</SubmitButton>
      <div className="sm:col-span-2"><FormMessage state={state} /></div>
    </form>
  )
}
