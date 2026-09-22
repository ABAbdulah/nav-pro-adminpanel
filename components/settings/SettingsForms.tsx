'use client'

import { useActionState } from 'react'
import { saveAlerts, saveFees } from '@/app/(panel)/settings/actions'
import type { ActionState, Settings } from '@/lib/types'
import { FormMessage, SubmitButton } from '@/components/forms'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'

function FeeRow({ label, prefix, fee }: { label: string; prefix: string; fee: { pct: number; fixed: number } }) {
  return (
    <fieldset className="grid gap-2">
      <legend className="field-label">{label}</legend>
      <div className="flex flex-wrap items-center gap-2 text-sm">
        <Input name={`${prefix}Pct`} inputMode="decimal" defaultValue={fee.pct} className="w-24" aria-label={`${label} percentage`} />
        <span>% of the order, plus $</span>
        <Input name={`${prefix}Fixed`} inputMode="decimal" defaultValue={fee.fixed.toFixed(2)} className="w-24" aria-label={`${label} fixed fee`} />
        <span>per payment</span>
      </div>
    </fieldset>
  )
}

export function FeesForm({ settings }: { settings: Settings['payment_fees'] }) {
  const [state, action] = useActionState<ActionState, FormData>(saveFees, {})
  return (
    <form action={action} className="grid gap-4">
      <FeeRow label="Stripe (cards, Apple Pay, Google Pay)" prefix="stripe" fee={settings.value.stripe} />
      <FeeRow label="PayPal" prefix="paypal" fee={settings.value.paypal} />
      <p className="field-help">Used only to estimate net profit. Check your Stripe and PayPal statements for your actual rates.</p>
      <div><SubmitButton pendingLabel="Saving…">Save fee rates</SubmitButton></div>
      <FormMessage state={state} />
    </form>
  )
}

export function AlertsForm({ settings }: { settings: Settings['order_alert_emails'] }) {
  const [state, action] = useActionState<ActionState, FormData>(saveAlerts, {})
  return (
    <form action={action} className="grid gap-3">
      <div>
        <label htmlFor="alert-emails" className="field-label">Email these addresses when an order is paid</label>
        <Textarea id="alert-emails" name="emails" defaultValue={settings.value.join('\n')} rows={3} placeholder={'orders@yourstore.com.au\nowner@example.com'} />
        <p className="field-help">One per line. The email has the order number, customer, total and parts, with a link to the order here. It never includes cost or profit.</p>
      </div>
      <div><SubmitButton pendingLabel="Saving…">Save</SubmitButton></div>
      <FormMessage state={state} />
    </form>
  )
}
