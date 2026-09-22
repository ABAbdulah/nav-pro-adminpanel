'use client'

import { useActionState } from 'react'
import { Undo2 } from 'lucide-react'
import { revertChange } from '@/app/(panel)/history/actions'
import type { ActionState } from '@/lib/types'
import { FormMessage, SubmitButton } from '@/components/forms'

export function UndoButton({ id }: { id: number }) {
  const [state, action] = useActionState<ActionState, FormData>(revertChange.bind(null, id), {})
  if (state.ok) return <FormMessage state={state} />
  return (
    <form action={action} className="grid gap-1">
      <SubmitButton variant="outline" size="sm" pendingLabel="Undoing…"><Undo2 aria-hidden="true" /> Undo</SubmitButton>
      {state.error && <FormMessage state={state} />}
    </form>
  )
}
