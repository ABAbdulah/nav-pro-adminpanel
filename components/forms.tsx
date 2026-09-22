'use client'

import { useFormStatus } from 'react-dom'
import { CheckCircle2, LoaderCircle } from 'lucide-react'
import { Button } from '@/components/ui/button'
import type { ActionState } from '@/lib/types'

type ButtonProps = React.ComponentProps<typeof Button> & { pendingLabel?: string }

/** A submit button that shows it is working while its form's action runs. */
export function SubmitButton({ children, pendingLabel, disabled, ...props }: ButtonProps) {
  const { pending } = useFormStatus()
  return (
    <Button type="submit" disabled={pending || disabled} {...props}>
      {pending && <LoaderCircle className="animate-spin" aria-hidden="true" />}
      {pending && pendingLabel ? pendingLabel : children}
    </Button>
  )
}

/** The outcome of the last save, announced to screen readers too. */
export function FormMessage({ state }: { state: ActionState }) {
  if (state.error) return <p role="alert" className="rounded-lg bg-[#fbe9e8] px-3 py-2 text-sm text-[#7d201c]">{state.error}</p>
  if (state.ok && state.message) {
    return (
      <p role="status" className="flex items-center gap-2 rounded-lg bg-[#e3f4ec] px-3 py-2 text-sm text-[#0f6a41]">
        <CheckCircle2 className="size-4 shrink-0" aria-hidden="true" /> {state.message}
      </p>
    )
  }
  return null
}

export function FieldError({ state, name }: { state: ActionState; name: string }) {
  const message = state.fieldErrors?.[name]?.[0]
  return message ? <p className="field-error">{message}</p> : null
}
