'use client'

import { useActionState, useEffect, useState } from 'react'
import { bulkProducts } from '@/app/(panel)/products/actions'
import type { ActionState } from '@/lib/types'
import { FormMessage, SubmitButton } from '@/components/forms'
import { Input } from '@/components/ui/input'

export const BULK_FORM = 'bulk-products'

const ACTIONS = [
  { value: 'hide', label: 'Hide from the store' },
  { value: 'show', label: 'Always show on the store' },
  { value: 'auto', label: 'Show or hide automatically' },
  { value: 'adjustPrice', label: 'Raise or lower the price by a %' },
  { value: 'setPrice', label: 'Set one price for all of them' },
  { value: 'resetPrice', label: 'Go back to the normal price' },
]

/**
 * The checkboxes on the product list belong to this form through their form
 * attribute, so the list itself stays a server-rendered table.
 */
export function BulkBar() {
  const [state, action] = useActionState<ActionState, FormData>(bulkProducts, {})
  const [count, setCount] = useState(0)
  const [choice, setChoice] = useState('hide')

  useEffect(() => {
    const boxes = () => Array.from(document.querySelectorAll<HTMLInputElement>(`input[form="${BULK_FORM}"][name="ids"]`))
    const update = () => setCount(boxes().filter((b) => b.checked).length)
    const onChange = (e: Event) => {
      const target = e.target as HTMLInputElement
      if (target.dataset.selectAll === 'true') boxes().forEach((b) => { b.checked = target.checked })
      update()
    }
    document.addEventListener('change', onChange)
    update()
    return () => document.removeEventListener('change', onChange)
  }, [])

  // After a change the list re-renders; clear the ticks so nothing is changed twice by accident.
  useEffect(() => {
    if (!state.ok) return
    document.querySelectorAll<HTMLInputElement>(`input[form="${BULK_FORM}"], input[data-select-all="true"]`).forEach((b) => { if (b.type === 'checkbox') b.checked = false })
    setCount(0)
  }, [state])

  const needsValue = choice === 'adjustPrice' || choice === 'setPrice'
  return (
    <form id={BULK_FORM} action={action} className="mb-3 grid gap-2 rounded-xl border bg-card p-3">
      <div className="flex flex-wrap items-end gap-2">
        <p className="min-h-10 py-2 text-sm font-semibold" aria-live="polite">{count === 0 ? 'Tick products to change several at once' : `${count} ticked`}</p>
        {count > 0 && (
          <>
            <label className="grid gap-1 text-[13px] font-semibold">
              Change
              <select name="action" value={choice} onChange={(e) => setChoice(e.target.value)} className="h-10 rounded-lg border border-input bg-card px-2 text-sm font-normal">
                {ACTIONS.map((a) => <option key={a.value} value={a.value}>{a.label}</option>)}
              </select>
            </label>
            {needsValue && (
              <label className="grid gap-1 text-[13px] font-semibold">
                {choice === 'adjustPrice' ? 'By % (e.g. 10 or -5)' : 'New price inc GST'}
                <Input name="value" inputMode="decimal" className="w-36" placeholder={choice === 'adjustPrice' ? '10' : '49.95'} />
              </label>
            )}
            <SubmitButton pendingLabel="Changing…">Apply to {count}</SubmitButton>
          </>
        )}
      </div>
      <FormMessage state={state} />
    </form>
  )
}
