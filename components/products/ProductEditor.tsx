'use client'

import { useActionState, useEffect, useRef, useState } from 'react'
import { ImageOff, LoaderCircle, Upload } from 'lucide-react'
import { saveProduct, uploadPhoto } from '@/app/(panel)/products/actions'
import type { ActionState, ProductDetail } from '@/lib/types'
import { money, percent } from '@/lib/format'
import { FieldError, FormMessage, SubmitButton } from '@/components/forms'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { cn } from '@/lib/utils'
import { shrink } from '@/lib/shrink-image'

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

function PhotoUpload({ productId, onUploaded }: { productId: number; onUploaded: (url: string, updatedAt: string | null) => void }) {
  const input = useRef<HTMLInputElement>(null)
  const [busy, setBusy] = useState(false)
  const [over, setOver] = useState(false)
  const [result, setResult] = useState<ActionState>({})

  async function send(file: File | undefined) {
    if (!file) return
    if (!file.type.startsWith('image/')) {
      setResult({ error: 'That file isn’t a photo. Choose a JPEG, PNG, WebP or iPhone photo.' })
      return
    }
    setBusy(true)
    setResult({})
    try {
      const blob = await shrink(file)
      const form = new FormData()
      form.set('photo', new File([blob], 'photo.jpg', { type: 'image/jpeg' }))
      const out = await uploadPhoto(productId, form)
      setResult(out)
      if (out.ok && out.imageUrl) onUploaded(out.imageUrl, out.updatedAt ?? null)
    } catch {
      setResult({ error: 'That photo couldn’t be opened here. Try saving it as a JPEG first.' })
    } finally {
      setBusy(false)
      if (input.current) input.current.value = ''
    }
  }

  return (
    <div className="grid gap-2">
      <div
        onDragOver={(e) => { e.preventDefault(); setOver(true) }}
        onDragLeave={() => setOver(false)}
        onDrop={(e) => { e.preventDefault(); setOver(false); void send(e.dataTransfer.files[0]) }}
        className={cn('grid place-items-center gap-2 rounded-lg border-2 border-dashed p-5 text-center text-sm', over ? 'border-brand bg-[#f3f8fa]' : 'border-input')}
      >
        {busy ? (
          <p className="flex items-center gap-2"><LoaderCircle className="size-4 animate-spin" aria-hidden="true" /> Uploading…</p>
        ) : (
          <>
            <Upload className="size-5 text-muted-foreground" aria-hidden="true" />
            <p>Drag a photo here, or</p>
            <button type="button" onClick={() => input.current?.click()} className="pf-button inline-flex items-center rounded-lg border border-input bg-card font-medium hover:bg-secondary">
              Choose a photo
            </button>
            <p className="text-xs text-muted-foreground">JPEG, PNG, WebP or an iPhone photo. It is resized for the store automatically.</p>
          </>
        )}
        <input ref={input} type="file" accept="image/*" className="sr-only" tabIndex={-1} aria-label="Photo file" onChange={(e) => void send(e.target.files?.[0])} />
      </div>
      <FormMessage state={result} />
    </div>
  )
}

export function ProductEditor({ product }: { product: ProductDetail }) {
  const [state, action] = useActionState<ActionState, FormData>(saveProduct.bind(null, product.id), {})
  const { override, supplier, pricing } = product
  const [priceMode, setPriceMode] = useState<'auto' | 'custom'>(override.sellIncGst === null ? 'auto' : 'custom')
  const [price, setPrice] = useState(override.sellIncGst?.toFixed(2) ?? supplier.autoSellIncGst?.toFixed(2) ?? '')
  const [imageUrl, setImageUrl] = useState(override.imageUrl ?? '')
  // Which version of the product this form is editing. An upload saves the
  // product too, so it moves this on; otherwise the next save would look like
  // it came from an out-of-date page.
  const [version, setVersion] = useState(override.updatedAt ?? '')
  useEffect(() => setVersion(override.updatedAt ?? ''), [override.updatedAt])
  const typed = Number(price.replace(/[$,\s]/g, ''))
  const liveMargin = priceMode === 'custom' ? marginFor(typed, pricing.costExGst) : marginFor(supplier.autoSellIncGst ?? 0, pricing.costExGst)
  const autoLabel = pricing.rrpIncGst ? 'the supplier’s RRP' : 'cost plus the markup rule'

  return (
    <form action={action} className="grid gap-6">
      {/* The edit is refused if someone else saved this product after this page loaded. */}
      <input type="hidden" name="ifUnchangedSince" value={version} />
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

      <div className="grid gap-3">
        <span className="field-label">Photo</span>
        <div className="flex flex-wrap gap-4">
          <Photo src={imageUrl || supplier.image} label={imageUrl ? 'Your photo (in use)' : 'Supplier’s photo (in use)'} />
          {imageUrl && <Photo src={supplier.image} label="Supplier’s photo" />}
        </div>
        <PhotoUpload productId={product.id} onUploaded={(url, at) => { setImageUrl(url); setVersion(at ?? '') }} />
        <details className="text-sm">
          <summary className="min-h-9 font-medium text-action-text">Or paste a link to a photo</summary>
          <Input id="imageUrl" type="url" aria-label="Link to a photo" inputMode="url" value={imageUrl} onChange={(e) => setImageUrl(e.target.value.trim())} placeholder="https://…" className="mt-2" />
        </details>
        {/* Sent with the form even while the link box is closed. */}
        <input type="hidden" name="imageUrl" value={imageUrl} />
        {imageUrl && <button type="button" onClick={() => setImageUrl('')} className="min-h-9 justify-self-start text-sm font-medium text-action-text underline">Use the supplier’s photo again (then save)</button>}
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
        {state.source === 'conflict' && (
          <a href={`/products/${product.id}`} className="justify-self-start text-sm font-semibold text-action-text underline">Reload this product</a>
        )}
        <SubmitButton size="lg" pendingLabel="Saving…" className="w-full sm:w-auto sm:justify-self-start">Save changes</SubmitButton>
      </div>
    </form>
  )
}
