'use client'

import { useActionState, useEffect, useState } from 'react'
import { Pencil, Plus, Trash2 } from 'lucide-react'
import { deleteRate, deleteZone, saveRate, saveZone } from '@/app/(panel)/shipping/actions'
import type { ActionState, Rate, Zone } from '@/lib/types'
import { money } from '@/lib/format'
import { FieldError, FormMessage, SubmitButton } from '@/components/forms'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Pill } from '@/components/page'

const STATES = ['NSW', 'VIC', 'QLD', 'SA', 'WA', 'TAS', 'NT', 'ACT']

/** Closes the form once a save succeeds. */
function useCloseOnSuccess(state: ActionState, close: () => void) {
  useEffect(() => {
    if (state.ok) close()
    // Only a new result should close the form, not a re-render with a new onDone.
  }, [state])
}

function ZoneForm({ zone, onDone }: { zone?: Zone; onDone: () => void }) {
  const [state, action] = useActionState<ActionState, FormData>(saveZone.bind(null, zone ? Number(zone.id) : null), {})
  const [everywhere, setEverywhere] = useState(zone ? zone.states === null : false)
  useCloseOnSuccess(state, onDone)
  const id = zone ? `zone-${zone.id}` : 'zone-new'

  return (
    <form action={action} className="grid gap-4 rounded-lg border bg-[#f8fafb] p-4">
      <div>
        <label htmlFor={`${id}-name`} className="field-label">Area name</label>
        <Input id={`${id}-name`} name="name" defaultValue={zone?.name ?? ''} placeholder="Sydney metro" maxLength={80} />
        <FieldError state={state} name="name" />
      </div>
      <fieldset>
        <legend className="field-label">States</legend>
        <label className="mb-2 flex items-center gap-2 text-sm">
          <input type="checkbox" name="everywhere" checked={everywhere} onChange={(e) => setEverywhere(e.target.checked)} className="size-4" /> All of Australia
        </label>
        {!everywhere && (
          <div className="flex flex-wrap gap-x-4 gap-y-2">
            {STATES.map((s) => (
              <label key={s} className="flex min-h-9 items-center gap-2 text-sm">
                <input type="checkbox" name={`state-${s}`} defaultChecked={zone?.states?.includes(s) ?? false} className="size-4" /> {s}
              </label>
            ))}
          </div>
        )}
        <FieldError state={state} name="states" />
      </fieldset>
      <fieldset>
        <legend className="field-label">Postcodes <span className="font-normal text-muted-foreground">(optional, to narrow it down)</span></legend>
        <div className="flex items-center gap-2">
          <Input name="postcodeFrom" defaultValue={zone?.postcode_from ?? ''} inputMode="numeric" maxLength={4} placeholder="2000" className="max-w-28" aria-label="From postcode" />
          <span>to</span>
          <Input name="postcodeTo" defaultValue={zone?.postcode_to ?? ''} inputMode="numeric" maxLength={4} placeholder="2234" className="max-w-28" aria-label="To postcode" />
        </div>
        <FieldError state={state} name="postcode" />
      </fieldset>
      <div className="flex flex-wrap items-end gap-4">
        <div>
          <label htmlFor={`${id}-priority`} className="field-label">Priority</label>
          <Input id={`${id}-priority`} name="priority" type="number" step={1} defaultValue={zone?.priority ?? 0} className="max-w-28" />
        </div>
        <label className="flex min-h-10 items-center gap-2 text-sm">
          <input type="checkbox" name="isActive" defaultChecked={zone?.is_active ?? true} className="size-4" /> In use
        </label>
      </div>
      <p className="field-help">When an address matches more than one area, the one with the higher priority is used. Give a narrow area (like a postcode range) a higher number than a wide one.</p>
      <div className="flex flex-wrap items-center gap-3">
        <SubmitButton pendingLabel="Saving…">{zone ? 'Save area' : 'Add area'}</SubmitButton>
        <button type="button" className="min-h-10 px-2 text-sm underline" onClick={onDone}>Cancel</button>
        <FormMessage state={state} />
      </div>
    </form>
  )
}

function RateForm({ zoneId, rate, onDone }: { zoneId: number; rate?: Rate; onDone: () => void }) {
  const [state, action] = useActionState<ActionState, FormData>(saveRate.bind(null, rate ? Number(rate.id) : null, zoneId), {})
  useCloseOnSuccess(state, onDone)
  const id = rate ? `rate-${rate.id}` : `rate-new-${zoneId}`
  return (
    <form action={action} className="grid gap-3 rounded-lg border bg-[#f8fafb] p-4">
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <div>
          <label htmlFor={`${id}-name`} className="field-label">Option name</label>
          <Input id={`${id}-name`} name="name" defaultValue={rate?.name ?? ''} placeholder="Standard" maxLength={80} />
          <FieldError state={state} name="name" />
        </div>
        <div>
          <label htmlFor={`${id}-price`} className="field-label">Customer pays (inc GST)</label>
          <Input id={`${id}-price`} name="price" inputMode="decimal" defaultValue={rate ? Number(rate.price_inc_gst).toFixed(2) : ''} placeholder="12.95" />
          <FieldError state={state} name="price" />
        </div>
        <div>
          <label htmlFor={`${id}-free`} className="field-label">Free when the order is over</label>
          <Input id={`${id}-free`} name="freeOver" inputMode="decimal" defaultValue={rate?.free_over_inc_gst ? Number(rate.free_over_inc_gst).toFixed(2) : ''} placeholder="Leave empty for never" />
          <FieldError state={state} name="freeOver" />
        </div>
        <div>
          <label htmlFor={`${id}-eta`} className="field-label">Delivery time shown</label>
          <Input id={`${id}-eta`} name="eta" defaultValue={rate?.eta_text ?? ''} placeholder="2-4 business days" maxLength={120} />
        </div>
      </div>
      <div className="flex flex-wrap items-end gap-4">
        <div>
          <label htmlFor={`${id}-priority`} className="field-label">Order in the list</label>
          <Input id={`${id}-priority`} name="priority" type="number" step={1} defaultValue={rate?.priority ?? 0} className="max-w-28" />
        </div>
        <label className="flex min-h-10 items-center gap-2 text-sm">
          <input type="checkbox" name="isActive" defaultChecked={rate?.is_active ?? true} className="size-4" /> Offered at checkout
        </label>
      </div>
      <div className="flex flex-wrap items-center gap-3">
        <SubmitButton pendingLabel="Saving…">{rate ? 'Save option' : 'Add option'}</SubmitButton>
        <button type="button" className="min-h-10 px-2 text-sm underline" onClick={onDone}>Cancel</button>
        <FormMessage state={state} />
      </div>
    </form>
  )
}

function DeleteButton({ label, action }: { label: string; action: (prev: ActionState, form: FormData) => Promise<ActionState> }) {
  const [confirming, setConfirming] = useState(false)
  const [state, run] = useActionState<ActionState, FormData>(action, {})
  if (!confirming) {
    return (
      <button type="button" onClick={() => setConfirming(true)} className="grid size-10 place-items-center rounded-lg text-destructive hover:bg-[#fbe9e8]" aria-label={`Delete ${label}`}>
        <Trash2 className="size-4" aria-hidden="true" />
      </button>
    )
  }
  return (
    <form action={run} className="flex items-center gap-1">
      <SubmitButton variant="destructive" size="sm" pendingLabel="Deleting…">Delete</SubmitButton>
      <button type="button" className="min-h-9 px-2 text-sm underline" onClick={() => setConfirming(false)}>Keep</button>
      {state.error && <span role="alert" className="field-error">{state.error}</span>}
    </form>
  )
}

function describeZone(zone: Zone): string {
  const where = zone.states === null ? 'All of Australia' : zone.states.join(', ')
  return zone.postcode_from ? `${where} · postcodes ${zone.postcode_from} to ${zone.postcode_to}` : where
}

export function ZoneCard({ zone, rates }: { zone: Zone; rates: Rate[] }) {
  const [editing, setEditing] = useState(false)
  const [adding, setAdding] = useState(false)
  const [editingRate, setEditingRate] = useState<string | null>(null)
  const zoneId = Number(zone.id)

  return (
    <section className="rounded-xl border bg-card">
      <div className="flex flex-wrap items-start justify-between gap-3 border-b px-4 py-3 sm:px-5">
        <div className="min-w-0">
          <h2 className="flex flex-wrap items-center gap-2 text-lg font-bold">
            {zone.name} {!zone.is_active && <Pill tone="muted">Not in use</Pill>}
          </h2>
          <p className="text-[13px] text-muted-foreground">{describeZone(zone)} · priority {zone.priority}</p>
        </div>
        <div className="flex items-center gap-1">
          <button type="button" onClick={() => setEditing((v) => !v)} className="grid size-10 place-items-center rounded-lg hover:bg-secondary" aria-label={`Edit ${zone.name}`}>
            <Pencil className="size-4" aria-hidden="true" />
          </button>
          <DeleteButton label={`${zone.name} and its delivery options`} action={deleteZone.bind(null, zoneId)} />
        </div>
      </div>
      <div className="grid gap-3 p-4 sm:p-5">
        {editing && <ZoneForm zone={zone} onDone={() => setEditing(false)} />}
        {rates.length === 0 && !adding && <p className="text-sm text-[#8a5a12]">No delivery options yet. Customers in this area can’t check out until you add one.</p>}
        {rates.length > 0 && (
          <ul className="divide-y">
            {rates.map((r) =>
              editingRate === r.id ? (
                <li key={r.id} className="py-2"><RateForm zoneId={zoneId} rate={r} onDone={() => setEditingRate(null)} /></li>
              ) : (
                <li key={r.id} className="flex flex-wrap items-center gap-x-4 gap-y-1 py-2.5">
                  <span className="min-w-0 flex-1">
                    <span className="font-medium">{r.name}</span> {!r.is_active && <Pill tone="muted">Not offered</Pill>}
                    <span className="block text-[13px] text-muted-foreground">
                      {r.eta_text ?? 'No delivery time shown'}
                      {r.free_over_inc_gst ? ` · free over ${money(Number(r.free_over_inc_gst))}` : ''}
                    </span>
                  </span>
                  <span className="font-semibold">{Number(r.price_inc_gst) === 0 ? 'Free' : money(Number(r.price_inc_gst))}</span>
                  <span className="flex items-center gap-1">
                    <button type="button" onClick={() => setEditingRate(r.id)} className="grid size-10 place-items-center rounded-lg hover:bg-secondary" aria-label={`Edit ${r.name}`}>
                      <Pencil className="size-4" aria-hidden="true" />
                    </button>
                    <DeleteButton label={r.name} action={deleteRate.bind(null, Number(r.id))} />
                  </span>
                </li>
              ),
            )}
          </ul>
        )}
        {adding ? (
          <RateForm zoneId={zoneId} onDone={() => setAdding(false)} />
        ) : (
          <button type="button" onClick={() => setAdding(true)} className="inline-flex min-h-10 items-center gap-2 justify-self-start rounded-lg border bg-card px-3 text-sm font-medium hover:bg-secondary">
            <Plus className="size-4" aria-hidden="true" /> Add a delivery option
          </button>
        )}
      </div>
    </section>
  )
}

export function AddZone() {
  const [open, setOpen] = useState(false)
  if (!open) {
    return (
      <Button type="button" onClick={() => setOpen(true)}>
        <Plus aria-hidden="true" /> Add a delivery area
      </Button>
    )
  }
  return <ZoneForm onDone={() => setOpen(false)} />
}
