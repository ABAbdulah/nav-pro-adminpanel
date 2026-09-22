'use client'

import { useActionState, useEffect, useState } from 'react'
import { Pencil, Trash2 } from 'lucide-react'
import { addRule, deleteRule, updateRule } from '@/app/(panel)/pricing/actions'
import type { ActionState, BrandCode, PriceRule } from '@/lib/types'
import { FieldError, FormMessage, SubmitButton } from '@/components/forms'
import { Input } from '@/components/ui/input'

function Fields({ state, rule, brands, idPrefix }: { state: ActionState; rule?: PriceRule; brands: BrandCode[]; idPrefix: string }) {
  return (
    <div className="grid gap-3 sm:grid-cols-[minmax(0,2fr)_120px_120px]">
      <div>
        <label htmlFor={`${idPrefix}-brand`} className="field-label">Supplier brand code <span className="font-normal text-muted-foreground">(empty = every brand)</span></label>
        <Input id={`${idPrefix}-brand`} name="brand" list="brand-codes" defaultValue={rule?.brand ?? ''} placeholder="e.g. BOSCH" autoComplete="off" />
      </div>
      <div>
        <label htmlFor={`${idPrefix}-markup`} className="field-label">Markup %</label>
        <Input id={`${idPrefix}-markup`} name="markup" inputMode="decimal" defaultValue={rule ? Number(rule.markup_pct) : ''} placeholder="40" />
        <FieldError state={state} name="markup" />
      </div>
      <div>
        <label htmlFor={`${idPrefix}-priority`} className="field-label">Priority</label>
        <Input id={`${idPrefix}-priority`} name="priority" type="number" step={1} defaultValue={rule?.priority ?? 0} />
        <FieldError state={state} name="priority" />
      </div>
    </div>
  )
}

export function AddRule({ brands }: { brands: BrandCode[] }) {
  const [state, action] = useActionState<ActionState, FormData>(addRule, {})
  return (
    <form action={action} className="grid gap-3">
      <Fields state={state} brands={brands} idPrefix="new" />
      <datalist id="brand-codes">{brands.map((b) => <option key={b.code} value={b.code}>{`${b.name} (${b.parts} parts)`}</option>)}</datalist>

      <div className="flex flex-wrap items-center gap-3">
        <SubmitButton pendingLabel="Adding…">Add rule</SubmitButton>
        <FormMessage state={state} />
      </div>
    </form>
  )
}

export function RuleRow({ rule, brands }: { rule: PriceRule; brands: BrandCode[] }) {
  const [editing, setEditing] = useState(false)
  const [confirming, setConfirming] = useState(false)
  const [editState, editAction] = useActionState<ActionState, FormData>(updateRule.bind(null, Number(rule.id)), {})
  const [delState, delAction] = useActionState<ActionState, FormData>(deleteRule.bind(null, Number(rule.id)), {})
  useEffect(() => {
    if (editState.ok) setEditing(false)
  }, [editState])
  const name = rule.brand ? brands.find((b) => b.code === rule.brand)?.name ?? rule.brand : 'Every brand'

  if (editing) {
    return (
      <li className="rounded-lg border bg-[#f8fafb] p-3">
        <form action={editAction} className="grid gap-3">
          <Fields state={editState} rule={rule} brands={brands} idPrefix={`r${rule.id}`} />
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
    <li className="flex flex-wrap items-center gap-x-4 gap-y-1 border-b py-3 last:border-b-0">
      <span className="min-w-0 flex-1">
        <span className="font-semibold">{name}</span>
        {rule.brand && <span className="ml-2 text-xs text-muted-foreground">{rule.brand}</span>}
        <span className="block text-[13px] text-muted-foreground">Priority {rule.priority}</span>
      </span>
      <span className="text-lg font-bold">+{Number(rule.markup_pct)}%</span>
      <span className="flex items-center gap-1">
        <button type="button" onClick={() => setEditing(true)} className="grid size-10 place-items-center rounded-lg hover:bg-secondary" aria-label={`Edit the rule for ${name}`}><Pencil className="size-4" aria-hidden="true" /></button>
        {confirming ? (
          <form action={delAction} className="flex items-center gap-1">
            <SubmitButton variant="destructive" size="sm" pendingLabel="Deleting…">Delete</SubmitButton>
            <button type="button" className="min-h-9 px-2 text-sm underline" onClick={() => setConfirming(false)}>Keep</button>
          </form>
        ) : (
          <button type="button" onClick={() => setConfirming(true)} className="grid size-10 place-items-center rounded-lg text-destructive hover:bg-[#fbe9e8]" aria-label={`Delete the rule for ${name}`}><Trash2 className="size-4" aria-hidden="true" /></button>
        )}
      </span>
      {delState.error && <p role="alert" className="field-error w-full">{delState.error}</p>}
    </li>
  )
}
