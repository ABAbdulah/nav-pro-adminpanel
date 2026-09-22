'use client'

import { useActionState, useState } from 'react'
import { ImageOff } from 'lucide-react'
import { saveProduct } from '@/app/(panel)/products/actions'
import type { ActionState, ProductDetail } from '@/lib/types'
import { money, percent } from '@/lib/format'
import { FieldError, FormMessage, SubmitButton } from '@/components/forms'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { cn } from '@/lib/utils'

function marginFor(priceIncGst: number, costExGst: number | null): number | null {
  if (!priceIncGst || costExGst === null) return null
  const ex = priceIncGst / 1.1
  return ((ex - costExGst) / ex) * 100
}

function Photo({ src, label }: { src: string | null; label: string }) {
  const [failed, setFailed] = useState<string | null>(null)
  const broken = src !== null && failed === src
  return (
    <figure className="grid gap-1">
      <div className="grid aspect-square w-full max-w-40 place-items-center overflow-hidden rounded-lg border bg-white">
        {src && !broken
          ? <img src={src} alt="" className="size-full object-contain" onError={() => setFailed(src)} />
          : <span className="grid place-items-center gap-1 p-2 text-center text-xs text-muted-foreground"><ImageOff className="size-5" aria-hidden="true" />{broken ? 'This link doesn’t show a picture' : 'No photo'}</span>}
      </div>
      <figcaption className="text-xs text-muted-foreground">{label}</figcaption>
    </figure>
  )
}

export function ProductEditor({ product }: { product: ProductDetail }) {
  const [state, action] = useActionState<ActionState, FormData>(saveProduct.bind(null, product.id), {})
  const { override, supplier, pricing } = product
  const [priceMode, setPriceMode] = useState<'auto' | 'custom'>(override.sellIncGst === null ? 'auto' : 'custom')
  const [price, setPrice] = useState(override.sellIncGst?.toFixed(2) ?? supplier.autoSellIncGst?.toFixed(2) ?? '')
  const [imageUrl, setImageUrl] = useState(override.imageUrl ?? '')
  const typed = Number(price.replace(/[$,\s]/g, ''))
  const liveMargin = priceMode === 'custom' ? marginFor(typed, pricing.costExGst) : marginFor(supplier.autoSellIncGst ?? 0, pricing.costExGst)
  const autoLabel = pricing.rrpIncGst ? 'the supplier’s RRP' : 'cost plus the markup rule'

  return (
    <form action={action} className="grid gap-6">
      <div>
        <label htmlFor="title" className="field-label">Title on the store</label>
        <Input id="title" name="title" defaultValue={override.title ?? ''} placeholder={product.current.title} maxLength={300} aria-describedby="title-help" />
        <p id="title-help" className="field-help">Leave empty to use the supplier’s title{override.title ? '' : ' (shown greyed out above)'}. The supplier’s name is never shown to customers.</p>
        <FieldError state={state} name="title" />
      </div>

      <div>
        <label htmlFor="description" className="field-label">Description</label>
        <Textarea id="description" name="description" defaultValue={override.description ?? ''} placeholder={supplier.description ?? 'No description from the supplier.'} rows={5} maxLength={5000} aria-describedby="description-help" />
        <p id="description-help" className="field-help">Leave empty to use the supplier’s description.</p>
        <FieldError state={state} name="description" />
      </div>

      <fieldset className="grid gap-3">
        <legend className="field-label">Price, including GST</legend>
        <label className={cn('flex items-start gap-3 rounded-lg border p-3', priceMode === 'auto' && 'border-brand bg-[#f3f8fa]')}>
          <input type="radio" name="priceMode" value="auto" checked={priceMode === 'auto'} onChange={() => setPriceMode('auto')} className="mt-1 size-4" />
          <span>
            <span className="block font-medium">Normal price: {money(supplier.autoSellIncGst)}</span>
            <span className="block text-[13px] text-muted-foreground">Follows {autoLabel}, and moves with it.</span>
          </span>
        </label>
        <label className={cn('flex items-start gap-3 rounded-lg border p-3', priceMode === 'custom' && 'border-brand bg-[#f3f8fa]')}>
          <input type="radio" name="priceMode" value="custom" checked={priceMode === 'custom'} onChange={() => setPriceMode('custom')} className="mt-1 size-4" />
          <span className="grid flex-1 gap-2">
            <span className="block font-medium">Set my own price</span>
            <span className="flex items-center gap-2">
              <span aria-hidden="true">$</span>
              <Input
                name="price"
                inputMode="decimal"
                value={price}
                onChange={(e) => { setPrice(e.target.value); setPriceMode('custom') }}
                onFocus={() => setPriceMode('custom')}
                className="max-w-40"
                aria-label="Your price including GST"
              />
            </span>
          </span>
        </label>
        <FieldError state={state} name="sellIncGst" />
        <p className={cn('text-[13px]', liveMargin !== null && liveMargin < 0 ? 'font-semibold text-destructive' : 'text-muted-foreground')} aria-live="polite">
          {pricing.costExGst === null
            ? 'The supplier cost isn’t known for this part, so the margin can’t be worked out.'
            : liveMargin === null
              ? `Cost from ${supplier.name}: ${money(pricing.costExGst)} ex GST.`
              : `At this price the margin is ${percent(liveMargin)} (cost ${money(pricing.costExGst)} ex GST${pricing.rrpIncGst ? `, RRP ${money(pricing.rrpIncGst)}` : ''}).${liveMargin < 0 ? ' That is below cost.' : ''}`}
        </p>
      </fieldset>

      <div>
        <label htmlFor="imageUrl" className="field-label">Photo</label>
        <div className="mb-3 flex flex-wrap gap-4">
          <Photo src={imageUrl || supplier.image} label={imageUrl ? 'Your photo' : 'Supplier’s photo (in use)'} />
          {imageUrl && <Photo src={supplier.image} label="Supplier’s photo" />}
        </div>
        <Input id="imageUrl" name="imageUrl" type="url" inputMode="url" value={imageUrl} onChange={(e) => setImageUrl(e.target.value.trim())} placeholder="https://…" aria-describedby="image-help" />
        <p id="image-help" className="field-help">Paste a link to a photo to use instead of the supplier’s. Leave empty to use the supplier’s photo. Uploading from your computer is coming next.</p>
        {imageUrl && <button type="button" onClick={() => setImageUrl('')} className="mt-1 min-h-9 text-sm font-medium text-action-text underline">Use the supplier’s photo again</button>}
        <FieldError state={state} name="imageUrl" />
      </div>

      <div>
        <label htmlFor="visibility" className="field-label">Show on the store</label>
        <select id="visibility" name="visibility" defaultValue={override.published === null ? 'auto' : override.published ? 'show' : 'hide'} className="h-10 w-full max-w-md rounded-lg border border-input bg-card px-2 text-sm">
          <option value="auto">Automatic ({supplier.autoPublished ? 'shown' : 'hidden: the supplier has withdrawn it'})</option>
          <option value="show">Always show</option>
          <option value="hide">Always hide</option>
        </select>
      </div>

      <div>
        <label htmlFor="notes" className="field-label">Internal notes</label>
        <Textarea id="notes" name="notes" defaultValue={override.notes ?? ''} rows={3} maxLength={2000} placeholder="Only the team sees these." />
      </div>

      <div className="sticky bottom-0 -mx-4 grid gap-2 border-t bg-card/95 px-4 py-3 backdrop-blur sm:-mx-5 sm:px-5">
        <FormMessage state={state} />
        <SubmitButton size="lg" pendingLabel="Saving…" className="w-full sm:w-auto sm:justify-self-start">Save changes</SubmitButton>
      </div>
    </form>
  )
}
