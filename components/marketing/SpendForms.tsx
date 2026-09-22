'use client'

import { useActionState, useEffect, useRef, useState } from 'react'
import { Pencil, Trash2 } from 'lucide-react'
import { addSpend, deleteSpend, updateSpend } from '@/app/(panel)/marketing/actions'
import type { ActionState, Spend } from '@/lib/types'
import { calendarDate, money } from '@/lib/format'
import { FieldError, FormMessage, SubmitButton } from '@/components/forms'
import { Input } from '@/components/ui/input'

const SUGGESTED = ['Google Ads', 'Facebook', 'Instagram', 'TikTok', 'YouTube', 'Email', 'Flyers', 'Sponsorship', 'Other']

function Fields({ state, spend, channels, today, idPrefix }: { state: ActionState; spend?: Spend; channels: string[]; today: string; idPrefix: string }) {
  const options = [...new Set([...channels, ...SUGGESTED])]
  return (
    <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-[160px_minmax(0,1fr)_minmax(0,1.4fr)_140px_auto] lg:items-start">
      <div>
        <label htmlFor={`${idPrefix}-date`} className="field-label">Date</label>
        <Input id={`${idPrefix}-date`} name="spentOn" type="date" defaultValue={spend?.spentOn ?? today} required />
        <FieldError state={state} name="spentOn" />
      </div>
      <div>
        <label htmlFor={`${idPrefix}-channel`} className="field-label">Where</label>
        <Input id={`${idPrefix}-channel`} name="channel" list={`${idPrefix}-channels`} defaultValue={spend?.channel ?? ''} placeholder="Google Ads" required maxLength={60} />
        <datalist id={`${idPrefix}-channels`}>{options.map((c) => <option key={c} value={c} />)}</datalist>
        <FieldError state={state} name="channel" />
      </div>
      <div>
        <label htmlFor={`${idPrefix}-description`} className="field-label">What for <span className="font-normal text-muted-foreground">(optional)</span></label>
        <Input id={`${idPrefix}-description`} name="description" defaultValue={spend?.description ?? ''} placeholder="Brake pads campaign" maxLength={500} />
      </div>
      <div>
        <label htmlFor={`${idPrefix}-amount`} className="field-label">Amount paid</label>
        <Input id={`${idPrefix}-amount`} name="amount" inputMode="decimal" defaultValue={spend ? spend.amountIncGst.toFixed(2) : ''} placeholder="150.00" required />
        <FieldError state={state} name="amount" />
      </div>
      <label className="flex min-h-10 items-center gap-2 text-sm lg:mt-7">
        <input type="checkbox" name="includesGst" defaultChecked={spend ? spend.gst > 0 : true} className="size-4" />
        Includes GST
      </label>
    </div>
  )
}

export function AddSpend({ channels, today }: { channels: string[]; today: string }) {
  const [state, action] = useActionState<ActionState, FormData>(addSpend, {})
  const form = useRef<HTMLFormElement>(null)
  useEffect(() => {
    if (state.ok) form.current?.reset()
  }, [state])
  return (
    <form ref={form} action={action} className="grid gap-3">
      <Fields state={state} channels={channels} today={today} idPrefix="add" />
      <p className="field-help">Enter the amount on the invoice. If it includes GST, the GST is taken off for the profit figures, because it is claimed back.</p>
      <div className="flex flex-wrap items-center gap-3">
        <SubmitButton pendingLabel="Adding…">Add spend</SubmitButton>
        <FormMessage state={state} />
      </div>
    </form>
  )
}

export function SpendRow({ spend, channels, today }: { spend: Spend; channels: string[]; today: string }) {
  const [editing, setEditing] = useState(false)
  const [confirming, setConfirming] = useState(false)
  const [editState, editAction] = useActionState<ActionState, FormData>(updateSpend.bind(null, spend.id), {})
  const [deleteState, deleteAction] = useActionState<ActionState, FormData>(deleteSpend.bind(null, spend.id), {})
  useEffect(() => {
    if (editState.ok) setEditing(false)
  }, [editState])

  if (editing) {
    return (
      <li className="rounded-lg border bg-[#f8fafb] p-3">
        <form action={editAction} className="grid gap-3">
          <Fields state={editState} spend={spend} channels={channels} today={today} idPrefix={`edit-${spend.id}`} />
          <div className="flex flex-wrap items-center gap-3">
            <SubmitButton pendingLabel="Saving…">Save</SubmitButton>
            <button type="button" className="min-h-10 px-2 text-sm underline" onClick={() => setEditing(false)}>Cancel</button>
            <FormMessage state={editState} />
          </div>
        </form>
      </li>
    )
  }

  return (
    <li className="flex flex-wrap items-center gap-x-4 gap-y-1 border-b py-2.5 last:border-b-0">
      <span className="w-20 shrink-0 text-sm text-muted-foreground">{calendarDate(spend.spentOn)}</span>
      <span className="min-w-0 flex-1">
        <span className="font-medium">{spend.channel}</span>
        {spend.description && <span className="block truncate text-[13px] text-muted-foreground">{spend.description}</span>}
      </span>
      <span className="num text-sm">
        <span className="font-semibold">{money(spend.amountIncGst)}</span>
        <span className="block text-xs text-muted-foreground">{spend.gst > 0 ? `${money(spend.amountExGst)} ex GST` : 'no GST'}</span>
      </span>
      <span className="flex items-center gap-1">
        <button type="button" onClick={() => setEditing(true)} className="grid size-10 place-items-center rounded-lg hover:bg-secondary" aria-label={`Edit ${spend.channel} on ${spend.spentOn}`}>
          <Pencil className="size-4" aria-hidden="true" />
        </button>
        {confirming ? (
          <form action={deleteAction} className="flex items-center gap-1">
            <SubmitButton variant="destructive" size="sm" pendingLabel="Deleting…">Delete</SubmitButton>
            <button type="button" className="min-h-9 px-2 text-sm underline" onClick={() => setConfirming(false)}>Keep</button>
          </form>
        ) : (
          <button type="button" onClick={() => setConfirming(true)} className="grid size-10 place-items-center rounded-lg text-destructive hover:bg-[#fbe9e8]" aria-label={`Delete ${spend.channel} on ${spend.spentOn}`}>
            <Trash2 className="size-4" aria-hidden="true" />
          </button>
        )}
      </span>
      {deleteState.error && <p role="alert" className="field-error w-full">{deleteState.error}</p>}
    </li>
  )
}
