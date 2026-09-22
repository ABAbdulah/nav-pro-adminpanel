import type { Metadata } from 'next'
import Link from 'next/link'
import { adminApi } from '@/lib/api'
import { requireOwner } from '@/lib/session'
import type { AuditEntry, Change, Page } from '@/lib/types'
import { dateTime, STATUS_LABEL } from '@/lib/format'
import { EmptyState, PageHeader, Pagination, withParams } from '@/components/page'
import { ErrorPanel } from '@/components/ErrorPanel'
import { UndoButton } from '@/components/history/UndoButton'

export const metadata: Metadata = { title: 'Change history' }

const ENTITIES: { key: string; label: string }[] = [
  { key: '', label: 'Everything' },
  { key: 'product', label: 'Products' },
  { key: 'order', label: 'Orders' },
  { key: 'stock', label: 'Our stock' },
  { key: 'price_rule', label: 'Pricing rules' },
  { key: 'shipping_zone', label: 'Delivery areas' },
  { key: 'shipping_rate', label: 'Delivery options' },
  { key: 'marketing', label: 'Marketing spend' },
  { key: 'marketing_budget', label: 'Marketing budgets' },
  { key: 'operator', label: 'Team' },
  { key: 'setting', label: 'Settings' },
]

const FIELD: Record<string, string> = {
  title: 'Title', description: 'Description', sell_inc_gst: 'Price', image_url: 'Photo', is_published: 'Show on store', notes: 'Notes',
  status: 'Status', carrier: 'Carrier', tracking_number: 'Tracking', admin_notes: 'Internal notes', shipping_cost_ex_gst: 'Delivery cost',
  qty: 'Quantity', location: 'Location', order: 'For order', role: 'Role', is_active: 'Can sign in', name: 'Name',
  markup_pct: 'Markup %', brand: 'Brand', priority: 'Priority', amount_ex_gst: 'Amount ex GST', gst: 'GST', spent_on: 'Date', channel: 'Where',
  price_inc_gst: 'Price', free_over_inc_gst: 'Free over', eta_text: 'Delivery time', states: 'States', postcode_from: 'Postcode from', postcode_to: 'Postcode to', value: 'Value',
}

function show(field: string, value: unknown): string {
  if (value === null || value === undefined || value === '') return 'empty'
  if (field === 'status' && typeof value === 'string' && value in STATUS_LABEL) return STATUS_LABEL[value as keyof typeof STATUS_LABEL]
  if (field === 'is_published') return value === true || value === 'true' ? 'shown' : 'hidden'
  if (field === 'is_active') return value === true || value === 'true' ? 'yes' : 'no'
  if (['sell_inc_gst', 'amount_ex_gst', 'gst', 'shipping_cost_ex_gst', 'price_inc_gst', 'free_over_inc_gst'].includes(field)) return `$${Number(value).toFixed(2)}`
  if (typeof value === 'object') return 'details'
  const text = String(value)
  return text.length > 70 ? `${text.slice(0, 70)}…` : text
}

function subject(e: AuditEntry) {
  if (e.entity === 'product') return <Link href={`/products/${e.entityId}`} className="font-medium text-action-text hover:underline">{e.label ?? `Product ${e.entityId}`}</Link>
  if (e.entity === 'order') return <Link href={`/orders/${e.entityId}`} className="font-medium text-action-text hover:underline">Order {e.entityId}</Link>
  if (e.entity === 'stock') return <Link href={`/products/${e.entityId}`} className="font-medium text-action-text hover:underline">Stock of product {e.entityId}</Link>
  const label = ENTITIES.find((x) => x.key === e.entity)?.label ?? e.entity
  return <span className="font-medium">{label}: {e.entityId}</span>
}

export default async function HistoryPage({ searchParams }: { searchParams: Promise<{ entity?: string; actor?: string; page?: string }> }) {
  await requireOwner()
  const search = await searchParams
  const entity = ENTITIES.some((e) => e.key === search.entity) ? search.entity || undefined : undefined
  const actor = search.actor || undefined
  const page = Math.max(1, Number(search.page) || 1)

  let data: Page<AuditEntry> & { actors: string[] }
  try {
    data = await adminApi<Page<AuditEntry> & { actors: string[] }>('/audit', { query: { entity, actor, page, limit: 50 } })
  } catch (e) {
    return <><PageHeader title="Change history" /><ErrorPanel error={e} /></>
  }
  const params = { entity, actor }

  return (
    <>
      <PageHeader title="Change history" description="Every change made in the admin panel, who made it, and when. Product edits can be undone." />

      <form action="/history" className="mb-4 flex flex-wrap items-end gap-3 rounded-xl border bg-card p-4">
        <label className="grid gap-1 text-[13px] font-semibold">
          What
          <select name="entity" defaultValue={entity ?? ''} className="h-10 rounded-lg border border-input bg-card px-2 text-sm font-normal">
            {ENTITIES.map((e) => <option key={e.key} value={e.key}>{e.label}</option>)}
          </select>
        </label>
        <label className="grid gap-1 text-[13px] font-semibold">
          Who
          <select name="actor" defaultValue={actor ?? ''} className="h-10 rounded-lg border border-input bg-card px-2 text-sm font-normal">
            <option value="">Anyone</option>
            {data.actors.map((a) => <option key={a} value={a}>{a}</option>)}
          </select>
        </label>
        <button type="submit" className="inline-flex h-10 items-center rounded-lg bg-brand px-4 text-sm font-medium text-brand-ink">Show</button>
      </form>

      {data.items.length === 0 ? (
        <EmptyState title="No changes yet" />
      ) : (
        <ol className="grid gap-2">
          {data.items.map((e) => (
            <li key={e.id} className="flex flex-wrap items-start justify-between gap-3 rounded-xl border bg-card p-4 [overflow-wrap:anywhere]">
              <div className="min-w-0 flex-1">
                <p className="text-xs text-muted-foreground">{dateTime(e.at)} · {e.actor ?? 'unknown'}</p>
                <p className="mt-0.5">{subject(e)} <span className="text-sm text-muted-foreground">{e.action === 'create' ? 'added' : e.action === 'delete' ? 'deleted' : 'changed'}</span></p>
                {e.action === 'update' && e.changes && (
                  <ul className="mt-1 grid gap-0.5 text-sm">
                    {Object.entries(e.changes as Record<string, Change>).map(([field, c]) => (
                      <li key={field}><span className="text-muted-foreground">{FIELD[field] ?? field}:</span> {show(field, c.from)} → <span className="font-medium">{show(field, c.to)}</span></li>
                    ))}
                  </ul>
                )}
              </div>
              {e.revertible && <UndoButton id={e.id} />}
            </li>
          ))}
        </ol>
      )}
      <Pagination page={data.page} limit={data.limit} total={data.total} href={(n) => withParams('/history', params, { page: n })} />
    </>
  )
}
