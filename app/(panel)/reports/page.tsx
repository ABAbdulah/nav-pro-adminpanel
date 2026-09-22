import type { Metadata } from 'next'
import Link from 'next/link'
import { Download } from 'lucide-react'
import { adminApi } from '@/lib/api'
import { requireOwner } from '@/lib/session'
import type { Breakdown } from '@/lib/types'
import { money, percent } from '@/lib/format'
import { resolveRange, type RangeSearch } from '@/lib/range'
import { Card, EmptyState, PageHeader } from '@/components/page'
import { ErrorPanel } from '@/components/ErrorPanel'
import { RangeControls } from '@/components/dashboard/RangeControls'
import { BreakdownChart } from '@/components/reports/BreakdownChart'
import { cn } from '@/lib/utils'

export const metadata: Metadata = { title: 'Reports' }

const GROUPS = [
  { key: 'category', label: 'Category' },
  { key: 'brand', label: 'Brand' },
  { key: 'supplier', label: 'Supplier' },
  { key: 'product', label: 'Product' },
] as const
const SORTS = [
  { key: 'revenue', label: 'Most sales' },
  { key: 'profit', label: 'Most profit' },
  { key: 'margin', label: 'Thinnest margin' },
  { key: 'units', label: 'Most units' },
] as const

type Search = RangeSearch & { by?: string; sort?: string }

function marginClass(m: number | null) {
  return m === null ? '' : m < 0 ? 'text-destructive font-semibold' : m < 15 ? 'text-warning font-semibold' : ''
}

export default async function ReportsPage({ searchParams }: { searchParams: Promise<Search> }) {
  await requireOwner()
  const search = await searchParams
  const by = GROUPS.find((g) => g.key === search.by)?.key ?? 'category'
  const sort = SORTS.find((s) => s.key === search.sort)?.key ?? 'revenue'
  const { range, from, to, interval } = resolveRange(search)

  let data: Breakdown
  try {
    data = await adminApi<Breakdown>('/reports/breakdown', { query: { from, to, by, sort, limit: 100 } })
  } catch (e) {
    return <><PageHeader title="Reports" /><ErrorPanel error={e} /></>
  }

  const keep = { by, sort }
  const link = (changes: Record<string, string>) => {
    const p = new URLSearchParams({ ...keep, ...(range === 'custom' ? { range, from, to } : { range }), ...changes })
    return `/reports?${p.toString()}`
  }
  const dates = new URLSearchParams({ from, to }).toString()
  const chip = 'inline-flex min-h-10 items-center rounded-lg border px-3 text-sm font-medium'
  const totals = data.items.reduce((t, i) => ({ sales: t.sales + i.revenueExGst, profit: t.profit + (i.profitExGst ?? 0) }), { sales: 0, profit: 0 })

  return (
    <>
      <PageHeader
        title="Reports"
        description="Where sales and profit come from. Figures are ex GST and count paid orders that still stand."
        actions={
          <div className="flex flex-wrap gap-2">
            <a href={`/export/orders?${dates}`} className={cn(chip, 'gap-2 bg-card hover:bg-secondary')}><Download className="size-4" aria-hidden="true" /> Orders</a>
            <a href={`/export/profit?${dates}&interval=${interval}`} className={cn(chip, 'gap-2 bg-card hover:bg-secondary')}><Download className="size-4" aria-hidden="true" /> Profit by {interval}</a>
            <a href={`/export/breakdown?${dates}&by=${by}`} className={cn(chip, 'gap-2 bg-card hover:bg-secondary')}><Download className="size-4" aria-hidden="true" /> This table</a>
          </div>
        }
      />
      <p className="-mt-3 mb-5 text-[13px] text-muted-foreground">Downloads are spreadsheet files (CSV) that open in Excel, Numbers or Google Sheets.</p>

      <RangeControls range={range} from={from} to={to} interval={interval} base="/reports" extra={keep} showInterval={false} />

      <div className="mb-4 flex flex-wrap items-end gap-x-6 gap-y-3">
        <div>
          <p className="mb-1.5 text-[13px] font-semibold">Sales by</p>
          <div className="flex flex-wrap gap-2" role="group" aria-label="Sales by">
            {GROUPS.map((g) => (
              <Link key={g.key} href={link({ by: g.key })} aria-current={by === g.key ? 'true' : undefined} className={cn(chip, by === g.key ? 'border-brand bg-brand text-brand-ink' : 'bg-card hover:bg-secondary')}>{g.label}</Link>
            ))}
          </div>
        </div>
        <div>
          <p className="mb-1.5 text-[13px] font-semibold">Order</p>
          <div className="flex flex-wrap gap-2" role="group" aria-label="Order">
            {SORTS.map((s) => (
              <Link key={s.key} href={link({ sort: s.key })} aria-current={sort === s.key ? 'true' : undefined} className={cn(chip, sort === s.key ? 'border-brand bg-brand text-brand-ink' : 'bg-card hover:bg-secondary')}>{s.label}</Link>
            ))}
          </div>
        </div>
      </div>

      {data.items.length === 0 ? (
        <EmptyState title="No sales in this period">Choose a longer period.</EmptyState>
      ) : (
        <div className="grid gap-6 xl:grid-cols-[minmax(0,2fr)_minmax(0,3fr)]">
          <Card title={`Top ${Math.min(10, data.items.length)} by ${SORTS.find((s) => s.key === sort)!.label.toLowerCase()}`} description="Tap a bar for the figures.">
            <BreakdownChart items={data.items} />
          </Card>
          <Card title={`Sales by ${by}`} description={`${data.items.length} shown · ${money(totals.sales)} sales, ${money(totals.profit)} profit`} bodyClassName="p-0">
            <div className="table-wrap max-h-[640px]">
              <table className="data-table">
                <thead>
                  <tr>
                    <th>{GROUPS.find((g) => g.key === by)!.label}</th>
                    <th className="num">Orders</th><th className="num">Units</th><th className="num">Sales</th><th className="num">Cost</th><th className="num">Profit</th><th className="num">Margin</th>
                  </tr>
                </thead>
                <tbody>
                  {data.items.map((i) => (
                    <tr key={i.key}>
                      <td className="min-w-48 max-w-72">
                        {i.partId ? <Link href={`/products/${i.partId}`} className="font-medium hover:underline">{i.label}</Link> : <span className="font-medium">{i.label}</span>}
                        {by === 'product' && <span className="block text-xs text-muted-foreground">{i.key}</span>}
                      </td>
                      <td className="num">{i.orders}</td>
                      <td className="num">{i.units}</td>
                      <td className="num">{money(i.revenueExGst)}</td>
                      <td className="num">{money(i.costExGst)}</td>
                      <td className="num">{money(i.profitExGst)}</td>
                      <td className={cn('num', marginClass(i.marginPct))}>{percent(i.marginPct)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </Card>
        </div>
      )}
      <p className="mt-4 text-[13px] text-muted-foreground">A part listed under several categories counts under the first one alphabetically, so every sale is counted once. Profit here is before marketing, delivery cost and fees; see the dashboard for those.</p>
    </>
  )
}
