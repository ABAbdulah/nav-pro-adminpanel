import type { Metadata } from 'next'
import Link from 'next/link'
import { Search } from 'lucide-react'
import { adminApi } from '@/lib/api'
import type { OrderSummary, Page } from '@/lib/types'
import { ago, dateTime, money } from '@/lib/format'
import { AutoRefresh } from '@/components/AutoRefresh'
import { EmptyState, PageHeader, Pagination, StatusBadge, withParams } from '@/components/page'
import { ErrorPanel } from '@/components/ErrorPanel'
import { cn } from '@/lib/utils'

export const metadata: Metadata = { title: 'Orders' }

const TABS = [
  { key: 'open', label: 'To send', status: 'open', empty: 'Nothing to send. Every paid order has shipped.' },
  { key: 'shipped', label: 'Shipped', status: 'shipped', empty: 'No shipped orders yet.' },
  { key: 'paid', label: 'All paid', status: undefined, empty: 'No paid orders yet.' },
  { key: 'unpaid', label: 'Not paid', status: 'pending', empty: 'No unpaid checkouts.' },
  { key: 'refunded', label: 'Refunded', status: 'refunded', empty: 'No refunds.' },
  { key: 'cancelled', label: 'Cancelled', status: 'cancelled', empty: 'No cancelled orders.' },
] as const

type Search = { tab?: string; q?: string; page?: string }

export default async function OrdersPage({ searchParams }: { searchParams: Promise<Search> }) {
  const search = await searchParams
  const tab = TABS.find((t) => t.key === search.tab) ?? TABS[0]
  const page = Math.max(1, Number(search.page) || 1)
  const q = search.q?.trim() ?? ''

  let data: Page<OrderSummary>
  try {
    data = await adminApi<Page<OrderSummary>>('/orders', { query: { status: q ? 'all' : tab.status, q, page, limit: 50 } })
  } catch (e) {
    return <><PageHeader title="Orders" /><ErrorPanel error={e} /></>
  }

  const params = { tab: tab.key, q: q || undefined }

  return (
    <>
      <AutoRefresh seconds={60} />
      <PageHeader title="Orders" description="New orders from the storefront appear here on their own, about once a minute." />

      <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
        {!q && (
          <nav aria-label="Order lists" className="-mx-1 flex max-w-full gap-1 overflow-x-auto px-1 pb-1">
            {TABS.map((t) => (
              <Link
                key={t.key}
                href={`/orders?tab=${t.key}`}
                aria-current={t.key === tab.key ? 'page' : undefined}
                className={cn('inline-flex min-h-10 shrink-0 items-center rounded-lg px-3 text-sm font-medium', t.key === tab.key ? 'bg-brand text-brand-ink' : 'bg-card border hover:bg-secondary')}
              >
                {t.label}
              </Link>
            ))}
          </nav>
        )}
        <form action="/orders" className="flex w-full gap-2 sm:w-auto" role="search">
          <input type="hidden" name="tab" value={tab.key} />
          <label className="sr-only" htmlFor="order-search">Search orders</label>
          <input id="order-search" name="q" defaultValue={q} placeholder="Order number, email or name" className="h-10 w-full min-w-0 rounded-lg border border-input bg-card px-3 text-sm sm:w-72" />
          <button type="submit" className="inline-flex h-10 items-center gap-2 rounded-lg border bg-card px-3 text-sm font-medium hover:bg-secondary"><Search className="size-4" aria-hidden="true" /> Search</button>
          {q && <Link href={`/orders?tab=${tab.key}`} className="inline-flex h-10 items-center px-2 text-sm underline">Clear</Link>}
        </form>
      </div>

      {q && <p className="mb-3 text-sm text-muted-foreground">{data.total} result{data.total === 1 ? '' : 's'} for “{q}”, across every status.</p>}

      {data.items.length === 0 ? (
        <EmptyState title={q ? 'No orders match that search' : tab.empty} />
      ) : (
        <>
          {/* Phones: one card per order. */}
          <ul className="grid gap-2 md:hidden">
            {data.items.map((o) => (
              <li key={o.orderNo}>
                <Link href={`/orders/${o.orderNo}`} className="block rounded-xl border bg-card p-4 active:bg-secondary">
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <p className="font-semibold">{o.customerName}</p>
                      <p className="text-xs text-muted-foreground">{o.orderNo} · {o.state} {o.postcode}</p>
                    </div>
                    <StatusBadge status={o.status} />
                  </div>
                  <div className="mt-2 flex items-center justify-between text-sm">
                    <span className="text-muted-foreground">{o.items} item{o.items === 1 ? '' : 's'} · {ago(o.paidAt ?? o.createdAt)}</span>
                    <span className="font-semibold">{money(o.totalIncGst)}</span>
                  </div>
                </Link>
              </li>
            ))}
          </ul>

          {/* Tablets and up: a table. */}
          <div className="table-wrap hidden rounded-xl border bg-card md:block">
            <table className="data-table">
              <thead>
                <tr><th>Order</th><th>Customer</th><th>Status</th><th>Delivery</th><th className="num">Items</th><th className="num">Total</th><th>{tab.key === 'unpaid' ? 'Started' : 'Paid'}</th></tr>
              </thead>
              <tbody>
                {data.items.map((o) => (
                  <tr key={o.orderNo}>
                    <td><Link href={`/orders/${o.orderNo}`} className="font-semibold text-action-text hover:underline">{o.orderNo}</Link></td>
                    <td className="max-w-56"><span className="block truncate">{o.customerName}</span><span className="block truncate text-xs text-muted-foreground">{o.email}</span></td>
                    <td><StatusBadge status={o.status} /></td>
                    <td className="whitespace-nowrap">{o.shippingLabel}<span className="block text-xs text-muted-foreground">{o.state} {o.postcode}{o.trackingNumber ? ` · ${o.carrier ?? ''} ${o.trackingNumber}` : ''}</span></td>
                    <td className="num">{o.items}</td>
                    <td className="num font-medium">{money(o.totalIncGst)}</td>
                    <td className="whitespace-nowrap" title={dateTime(o.paidAt ?? o.createdAt)}>{ago(o.paidAt ?? o.createdAt)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <Pagination page={data.page} limit={data.limit} total={data.total} href={(p) => withParams('/orders', params, { page: p })} />
        </>
      )}
    </>
  )
}
