import type { Metadata } from 'next'
import Link from 'next/link'
import { Search } from 'lucide-react'
import { adminApi } from '@/lib/api'
import { requireOwner } from '@/lib/session'
import type { Customer, Page } from '@/lib/types'
import { date, money } from '@/lib/format'
import { EmptyState, PageHeader, Pagination, Pill, withParams } from '@/components/page'
import { ErrorPanel } from '@/components/ErrorPanel'
import { cn } from '@/lib/utils'

export const metadata: Metadata = { title: 'Customers' }

const SORTS = [
  { key: 'recent', label: 'Most recent' },
  { key: 'spent', label: 'Spent most' },
  { key: 'orders', label: 'Most orders' },
] as const

export default async function CustomersPage({ searchParams }: { searchParams: Promise<{ q?: string; sort?: string; page?: string }> }) {
  await requireOwner()
  const search = await searchParams
  const q = search.q?.trim() || undefined
  const sort = SORTS.find((s) => s.key === search.sort)?.key ?? 'recent'
  const page = Math.max(1, Number(search.page) || 1)

  let data: Page<Customer>
  try {
    data = await adminApi<Page<Customer>>('/customers', { query: { q, sort, page, limit: 50 } })
  } catch (e) {
    return <><PageHeader title="Customers" /><ErrorPanel error={e} /></>
  }
  const params = { q, sort }

  return (
    <>
      <PageHeader title="Customers" description="Everyone who has paid for an order, grouped by email. Guests count too." />

      <div className="mb-4 flex flex-wrap items-end justify-between gap-3">
        <div className="flex flex-wrap gap-2" role="group" aria-label="Order">
          {SORTS.map((s) => (
            <Link key={s.key} href={withParams('/customers', params, { sort: s.key, page: undefined })} aria-current={sort === s.key ? 'true' : undefined}
              className={cn('inline-flex min-h-10 items-center rounded-lg border px-3 text-sm font-medium', sort === s.key ? 'border-brand bg-brand text-brand-ink' : 'bg-card hover:bg-secondary')}>
              {s.label}
            </Link>
          ))}
        </div>
        <form action="/customers" className="flex w-full gap-2 sm:w-auto" role="search">
          <input type="hidden" name="sort" value={sort} />
          <label htmlFor="customer-search" className="sr-only">Search customers</label>
          <input id="customer-search" name="q" defaultValue={q} placeholder="Name, email or phone" className="h-10 w-full min-w-0 rounded-lg border border-input bg-card px-3 text-sm sm:w-72" />
          <button type="submit" className="inline-flex h-10 items-center gap-2 rounded-lg border bg-card px-3 text-sm font-medium hover:bg-secondary"><Search className="size-4" aria-hidden="true" /> Search</button>
        </form>
      </div>

      {data.items.length === 0 ? (
        <EmptyState title={q ? 'No customers match' : 'No customers yet'}>{q ? 'Try part of their email or name.' : 'Customers appear here after their first paid order.'}</EmptyState>
      ) : (
        <>
          <ul className="grid gap-2 md:hidden">
            {data.items.map((c) => (
              <li key={c.email}>
                <Link href={`/customers/${encodeURIComponent(c.email)}`} className="block rounded-xl border bg-card p-4 active:bg-secondary">
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0"><p className="font-semibold">{c.name}</p><p className="truncate text-xs text-muted-foreground">{c.email}</p></div>
                    <span className="font-semibold">{money(c.spentIncGst)}</span>
                  </div>
                  <p className="mt-1 text-sm text-muted-foreground">{c.orders} order{c.orders === 1 ? '' : 's'} · last {date(c.lastOrderAt)}</p>
                </Link>
              </li>
            ))}
          </ul>
          <div className="table-wrap hidden rounded-xl border bg-card md:block">
            <table className="data-table">
              <thead><tr><th>Customer</th><th>Phone</th><th className="num">Orders</th><th className="num">Spent inc GST</th><th>First order</th><th>Last order</th><th>Account</th></tr></thead>
              <tbody>
                {data.items.map((c) => (
                  <tr key={c.email}>
                    <td className="max-w-72">
                      <Link href={`/customers/${encodeURIComponent(c.email)}`} className="font-semibold text-action-text hover:underline">{c.name}</Link>
                      <span className="block truncate text-xs text-muted-foreground">{c.email}</span>
                    </td>
                    <td className="whitespace-nowrap">{c.phone}</td>
                    <td className="num">{c.orders}</td>
                    <td className="num font-medium">{money(c.spentIncGst)}</td>
                    <td className="whitespace-nowrap">{date(c.firstOrderAt)}</td>
                    <td className="whitespace-nowrap">{date(c.lastOrderAt)}</td>
                    <td>{c.hasAccount ? <Pill tone="info">Account</Pill> : <Pill>Guest</Pill>}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <Pagination page={data.page} limit={data.limit} total={data.total} href={(n) => withParams('/customers', params, { page: n })} />
        </>
      )}
    </>
  )
}
