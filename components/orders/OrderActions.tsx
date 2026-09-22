'use client'

import { useActionState, useState } from 'react'
import { PackageCheck, Send } from 'lucide-react'
import { updateOrder } from '@/app/(panel)/orders/actions'
import type { ActionState } from '@/lib/types'
import type { OrderDetail } from '@/lib/types'
import { Card } from '@/components/page'
import { FormMessage, SubmitButton } from '@/components/forms'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'

function CarrierFields({ carriers, carrier, tracking, idPrefix }: { carriers: string[]; carrier: string; tracking: string; idPrefix: string }) {
  return (
    <>
      <div>
        <label htmlFor={`${idPrefix}-carrier`} className="field-label">Carrier</label>
        <Input id={`${idPrefix}-carrier`} name="carrier" list={`${idPrefix}-carriers`} defaultValue={carrier} placeholder="e.g. Australia Post" autoComplete="off" />
        <datalist id={`${idPrefix}-carriers`}>{carriers.map((c) => <option key={c} value={c} />)}</datalist>
        <p className="field-help">Pick one from the list to give the customer a tracking link.</p>
      </div>
      <div>
        <label htmlFor={`${idPrefix}-tracking`} className="field-label">Tracking number</label>
        <Input id={`${idPrefix}-tracking`} name="trackingNumber" defaultValue={tracking} autoComplete="off" spellCheck={false} />
      </div>
    </>
  )
}

/** One of the confirm-first actions: cancel or record a refund. */
function EndOrder({ status, provider, action, state }: {
  status: 'cancelled' | 'refunded'
  provider: string | null
  action: (form: FormData) => void
  state: ActionState
}) {
  const [open, setOpen] = useState(false)
  const refund = status === 'refunded'
  const where = provider === 'paypal' ? 'PayPal' : provider === 'stripe' ? 'Stripe' : 'Stripe or PayPal'

  if (!open) {
    return (
      <button type="button" onClick={() => setOpen(true)} className="min-h-10 text-left text-sm font-medium text-destructive underline">
        {refund ? 'Record a refund' : 'Cancel this order'}
      </button>
    )
  }
  return (
    <form action={action} className="grid gap-3 rounded-lg border border-destructive/40 p-3">
      <input type="hidden" name="intent" value="status" />
      <input type="hidden" name="status" value={status} />
      <p className="text-sm">
        {refund
          ? `This only records the refund. Send the money back first, in the ${where} dashboard.`
          : `Cancelling stops the order. If it was paid, refund the customer in the ${where} dashboard too.`}
      </p>
      <label className="flex items-start gap-2 text-sm">
        <input type="checkbox" name="confirm" className="mt-1 size-4" />
        {refund ? 'The money has been refunded' : 'Yes, cancel this order'}
      </label>
      {state.error && state.source === status && <FormMessage state={state} />}
      <div className="flex gap-2">
        <SubmitButton variant="destructive" pendingLabel="Saving…">{refund ? 'Record refund' : 'Cancel order'}</SubmitButton>
        <button type="button" className="min-h-10 px-2 text-sm underline" onClick={() => setOpen(false)}>Keep it</button>
      </div>
    </form>
  )
}

export function OrderActions({ order, carriers }: { order: OrderDetail; carriers: string[] }) {
  const bound = updateOrder.bind(null, order.orderNo)
  // One result for every status change: the form that made it usually
  // disappears once the order moves on, so its message is shown up here.
  const [statusState, statusAction] = useActionState<ActionState, FormData>(bound, {})
  const [trackState, trackAction] = useActionState<ActionState, FormData>(bound, {})
  const [noteState, noteAction] = useActionState<ActionState, FormData>(bound, {})
  const next = order.nextStatuses
  const provider = order.payments.find((p) => p.status === 'succeeded')?.provider ?? order.payments.at(-1)?.provider ?? null

  return (
    <Card title="Next step">
      <div className="grid gap-5">
        {/* Cancel and refund show their own errors beside their confirm box. */}
        {!(statusState.error && (statusState.source === 'cancelled' || statusState.source === 'refunded')) && <FormMessage state={statusState} />}
        {next.includes('packing') && (
          <form action={statusAction} className="grid gap-2">
            <input type="hidden" name="intent" value="status" />
            <input type="hidden" name="status" value="packing" />
            <SubmitButton variant="outline" size="lg" pendingLabel="Saving…"><PackageCheck aria-hidden="true" /> Start packing</SubmitButton>
          </form>
        )}

        {next.includes('shipped') && (
          <form action={statusAction} className="grid gap-3">
            <input type="hidden" name="intent" value="status" />
            <input type="hidden" name="status" value="shipped" />
            <h3 className="text-base font-bold">Mark as shipped</h3>
            <CarrierFields carriers={carriers} carrier={order.carrier ?? 'Australia Post'} tracking={order.trackingNumber ?? ''} idPrefix="ship" />
            <label className="flex items-start gap-2 text-sm">
              <input type="checkbox" name="notifyCustomer" defaultChecked className="mt-1 size-4" />
              Email {order.email} the tracking details
            </label>
            <SubmitButton size="lg" pendingLabel="Saving…"><Send aria-hidden="true" /> Mark shipped</SubmitButton>
          </form>
        )}

        {order.status === 'shipped' && (
          <form action={trackAction} className="grid gap-3">
            <input type="hidden" name="intent" value="tracking" />
            <h3 className="text-base font-bold">Tracking</h3>
            <CarrierFields carriers={carriers} carrier={order.carrier ?? ''} tracking={order.trackingNumber ?? ''} idPrefix="track" />
            <SubmitButton variant="outline" pendingLabel="Saving…">Save tracking</SubmitButton>
            <FormMessage state={trackState} />
          </form>
        )}

        {order.status === 'pending' && (
          <p className="text-sm text-muted-foreground">The customer started checkout but has not paid. It becomes a real order the moment their payment goes through.</p>
        )}
        {(order.status === 'cancelled' || order.status === 'refunded') && (
          <p className="text-sm text-muted-foreground">This order is closed. Nothing more to do.</p>
        )}

        <form action={noteAction} className="grid gap-2 border-t pt-4">
          <input type="hidden" name="intent" value="notes" />
          <label htmlFor="admin-notes" className="field-label">Internal notes</label>
          <Textarea id="admin-notes" name="adminNotes" defaultValue={order.adminNotes ?? ''} placeholder="Only the team sees these." maxLength={4000} />
          <SubmitButton variant="outline" pendingLabel="Saving…">Save notes</SubmitButton>
          <FormMessage state={noteState} />
        </form>

        {(next.includes('cancelled') || next.includes('refunded')) && (
          <div className="grid gap-2 border-t pt-4">
            {next.includes('refunded') && <EndOrder status="refunded" provider={provider} action={statusAction} state={statusState} />}
            {next.includes('cancelled') && <EndOrder status="cancelled" provider={provider} action={statusAction} state={statusState} />}
          </div>
        )}
      </div>
    </Card>
  )
}
