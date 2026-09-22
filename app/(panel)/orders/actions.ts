'use server'

import { revalidatePath } from 'next/cache'
import { ApiError, adminApi, type ActionState } from '@/lib/api'
import type { OrderDetail, OrderStatus } from '@/lib/types'

const STATUSES: OrderStatus[] = ['pending', 'paid', 'packing', 'shipped', 'cancelled', 'refunded']

const text = (form: FormData, name: string) => {
  const value = form.get(name)
  return typeof value === 'string' ? value.trim() : ''
}

/**
 * Every order change goes through here. The form's "intent" says which:
 * status (move to another status, with carrier and tracking when shipping),
 * tracking (correct carrier or tracking number) or notes.
 */
export async function updateOrder(orderNo: string, _prev: ActionState, form: FormData): Promise<ActionState> {
  const intent = text(form, 'intent')
  const body: Record<string, unknown> = {}
  let success = 'Saved.'

  if (intent === 'status') {
    const status = text(form, 'status') as OrderStatus
    if (!STATUSES.includes(status)) return { error: 'Choose what to change the order to.' }
    body.status = status
    if (status === 'shipped') {
      body.carrier = text(form, 'carrier') || null
      body.trackingNumber = text(form, 'trackingNumber') || null
      body.notifyCustomer = form.get('notifyCustomer') === 'on'
      // Only sent when the form offered it, i.e. we hold stock of a line.
      if (form.has('stockOffered')) body.takeFromStock = form.get('takeFromStock') === 'on'
    }
    if ((status === 'cancelled' || status === 'refunded') && form.get('confirm') !== 'on') {
      return { source: status, error: status === 'refunded' ? 'Tick the box to confirm the money has been refunded.' : 'Tick the box to confirm cancelling this order.' }
    }
  } else if (intent === 'tracking') {
    body.carrier = text(form, 'carrier') || null
    body.trackingNumber = text(form, 'trackingNumber') || null
    success = 'Tracking saved. The customer sees it on their order page.'
  } else if (intent === 'deliveryCost') {
    const raw = text(form, 'shippingCost').replace(/[$,s]/g, '')
    const cost = raw === '' ? null : Number(raw)
    if (cost !== null && (!Number.isFinite(cost) || cost < 0)) return { source: 'deliveryCost', error: 'Enter what the carrier charged, like 12.40, or leave it empty.' }
    body.shippingCostExGst = cost === null ? null : Math.round(cost * 100) / 100
    success = cost === null ? 'Delivery cost cleared.' : 'Delivery cost saved. Profit figures include it now.'
  } else if (intent === 'notes') {
    body.adminNotes = text(form, 'adminNotes') || null
    success = 'Notes saved.'
  } else {
    return { error: 'Unknown change.' }
  }

  try {
    const updated = await adminApi<OrderDetail>(`/orders/${encodeURIComponent(orderNo)}`, { method: 'PATCH', body })
    if (intent === 'status') {
      success =
        body.status === 'shipped'
          ? updated.notified
            ? 'Marked shipped, and the customer has been emailed the tracking details.'
            : body.notifyCustomer
              ? 'Marked shipped. The email to the customer could not be sent; check the mail settings on the API.'
              : 'Marked shipped. No email was sent.'
          : body.status === 'packing' ? 'Marked as packing.'
          : body.status === 'refunded' ? 'Refund recorded.'
          : body.status === 'cancelled' ? 'Order cancelled.'
          : 'Status changed.'
    }
  } catch (e) {
    if (e instanceof ApiError) return { source: intent === 'status' ? String(body.status) : intent, error: e.status === 409 ? `${e.message} Reload the page to see the latest.` : e.message }
    throw e
  }

  revalidatePath(`/orders/${orderNo}`)
  revalidatePath('/orders')
  revalidatePath('/')
  return { ok: true, message: success }
}
