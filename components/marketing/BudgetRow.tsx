'use client'

import { useActionState } from 'react'
import { saveBudget } from '@/app/(panel)/marketing/actions'
import type { ActionState, Budget } from '@/lib/types'
import { calendarDate, money } from '@/lib/format'
import { FormMessage, SubmitButton } from '@/components/forms'
import { Input } from '@/components/ui/input'
import { cn } from '@/lib/utils'

/** One month: its budget (editable), what was spent, and how far through it that is. */
export function BudgetRow({ budget }: { budget: Budget }) {
  const [state, action] = useActionState<ActionState, FormData>(saveBudget.bind(null, budget.month), {})
  const share = budget.budgetExGst ? Math.min(100, (budget.spentExGst / budget.budgetExGst) * 100) : 0
  const over = budget.budgetExGst !== null && budget.spentExGst > budget.budgetExGst
  return (
    <li className="grid gap-2 border-b py-3 last:border-b-0">
      <form action={action} className="flex flex-wrap items-center gap-x-4 gap-y-2">
        <span className="w-24 shrink-0 font-semibold">{calendarDate(`${budget.month}-01`, 'month')}</span>
        <span className="min-w-40 flex-1 text-sm">
          Spent <strong>{money(budget.spentExGst)}</strong>
          {budget.budgetExGst !== null && <> of {money(budget.budgetExGst)}{over && <strong className="text-destructive"> (over by {money(budget.spentExGst - budget.budgetExGst)})</strong>}</>}
          {budget.budgetExGst !== null && (
            <span className="mt-1 block h-2 overflow-hidden rounded-full bg-muted" aria-hidden="true">
              <span className={cn('block h-full rounded-full', over ? 'bg-destructive' : 'bg-brand')} style={{ width: `${share}%` }} />
            </span>
          )}
        </span>
        <span className="flex items-center gap-1">
          <span aria-hidden="true">$</span>
          <Input name="amount" inputMode="decimal" defaultValue={budget.budgetExGst ?? ''} placeholder="Budget" className="w-28" aria-label={`Budget for ${budget.month}, ex GST`} />
          <SubmitButton variant="outline" size="sm" pendingLabel="Saving…">Save</SubmitButton>
        </span>
      </form>
      <FormMessage state={state} />
    </li>
  )
}
