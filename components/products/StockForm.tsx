'use client'

import { useActionState } from 'react'
import { saveStock } from '@/app/(panel)/products/actions'
import type { ActionState, ProductDetail } from '@/lib/types'
import { dateTime } from '@/lib/format'
import { FieldError, FormMessage, SubmitButton } from '@/components/forms'
import { Input } from '@/components/ui/input'

/** How many of this part we hold ourselves. Shipping an order takes its qty off. */
export function StockForm({ product }: { product: ProductDetail }) {
  const [state, action] = useActionState<ActionState, FormData>(saveStock.bind(null, product.id), {})
  const own = product.ownStock
  return (
    <form action={action} className="grid gap-3">
      <div className="flex flex-wrap items-end gap-3">
        <div>
          <label htmlFor="own-qty" className="field-label">We hold</label>
          <Input id="own-qty" name="qty" type="number" min={0} step={1} inputMode="numeric" defaultValue={own?.qty ?? ''} placeholder="0" className="w-28" />
        </div>
        <div className="min-w-40 flex-1">
          <label htmlFor="own-location" className="field-label">Where <span className="font-normal text-muted-foreground">(optional)</span></label>
          <Input id="own-location" name="location" defaultValue={own?.location ?? ''} placeholder="Shelf B2" maxLength={80} />
        </div>
      </div>
      <FieldError state={state} name="qty" />
      <p className="field-help">
        {own
          ? `Last counted ${dateTime(own.updatedAt)}${own.updatedBy ? ` by ${own.updatedBy}` : ''}. Marking an order shipped takes the parts sent off this number.`
          : 'Only for parts you keep on your own shelves. The storefront still shows the supplier’s stock.'}
      </p>
      <div className="flex flex-wrap items-center gap-3">
        <SubmitButton variant="outline" pendingLabel="Saving…">Save stock</SubmitButton>
        {own && <button type="submit" name="stop" value="1" className="min-h-10 text-sm text-destructive underline">Stop tracking</button>}
      </div>
      <FormMessage state={state} />
    </form>
  )
}
