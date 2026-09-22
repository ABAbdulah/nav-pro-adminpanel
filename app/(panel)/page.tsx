import type { Metadata } from 'next'
import Link from 'next/link'
import { AlertTriangle, Info } from 'lucide-react'
import { adminApi } from '@/lib/api'
import type { Overview, SalesReport } from '@/lib/types'
import { money, moneyShort, percent, shiftDays, today } from '@/lib/format'
import { Card, PageHeader } from '@/components/page'
import { ErrorPanel } from '@/components/ErrorPanel'
import { RangeControls, type RangeKey } from '@/components/dashboard/RangeControls'
import { SalesChart } from '@/components/dashboard/SalesChart'

export const metadata: Metadata = { title: 'Dashboard' }

type Search = { range?: string; from?: string; to?: string; interval?: string }
const DATE = /^\d{4}-\d{2}-\d{2}$/
const RANGES: RangeKey[] = ['7d', '30d', '90d', '12m', 'all', 'custom']

function monthsBack(ymd: string, months: number): string {
  const d = new Date(`${ymd.slice(0, 7)}-01T00:00:00Z`)
  d.setUTCMonth(d.getUTCMonth() - months)
  return d.toISOString().slice(0, 10)
}

/** The dates the report covers, from the URL. Defaults to the last 30 days. */
function resolveRange(search: Search, firstSale: string | null) {
  const end = today()
  const range: RangeKey = RANGES.includes(search.range as RangeKey) ? (search.range as RangeKey) : search.from ? 'custom' : '30d'
  let from: string
  let to = end
  if (range === '7d') from = shiftDays(end, -6)
  else if (range === '90d') from = shiftDays(end, -89)
  else if (range === '12m') from = monthsBack(end, 11)
  else if (range === 'all') from = firstSale ?? shiftDays(end, -29)
  else if (range === 'custom' && search.from && DATE.test(search.from)) {
    from = search.from
    to = search.to && DATE.test(search.to) && search.to >= search.from ? search.to : end
  } else from = shiftDays(end, -29)
  const days = (Date.parse(to) - Date.parse(from)) / 86_400_000 + 1
  const interval = search.interval === 'day' || search.interval === 'month'
    ? (search.interval === 'day' && days > 730 ? 'month' : search.interval)
    : days > 92 ? 'month' : 'day'
  return { range, from, to, interval: interval as 'day' | 'month' }
}

function Stat({ label, value, note, tone }: { label: string; value: string; note?: React.ReactNode; tone?: 'good' | 'bad' }) {
  return (
    <div className="min-w-0 rounded-xl border bg-card p-4">
      <p className="text-[13px] font-medium text-muted-foreground">{label}</p>
      <p className={`mt-1 truncate font-heading text-[28px] font-bold leading-tight ${tone === 'bad' ? 'text-destructive' : tone === 'good' ? 'text-success' : ''}`}>{value}</p>
      {note && <p className="mt-0.5 text-[13px] text-muted-foreground">{note}</p>}
    </div>
  )
}

export default async function Dashboard({ searchParams }: { searchParams: Promise<Search> }) {
  const search = await searchParams
  let report: SalesReport
  let overview: Overview
  try {
    let resolved = resolveRange(search, null)
    ;[report, overview] = await Promise.all([
      adminApi<SalesReport>('/reports/sales', { query: { from: resolved.from, to: resolved.to, interval: resolved.interval } }),
      adminApi<Overview>('/reports/overview'),
    ])
    // "All time" needs the first sale's date, which only the report knows.
    if (resolved.range === 'all' && report.allTime.firstSaleAt) {
      const first = new Intl.DateTimeFormat('en-CA', { timeZone: report.timezone }).format(new Date(report.allTime.firstSaleAt))
      resolved = resolveRange(search, first)
      report = await adminApi<SalesReport>('/reports/sales', { query: { from: resolved.from, to: resolved.to, interval: resolved.interval } })
    }
  } catch (e) {
    return <><PageHeader title="Dashboard" /><ErrorPanel error={e} /></>
  }

  const { range } = resolveRange(search, null)
  const t = report.totals
  const all = report.allTime

  return (
    <>
      <PageHeader title="Dashboard" description="Sales and profit, excluding GST. Days follow Sydney time." />

      <div className="mb-6 grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        <Link href="/orders?tab=open" className="rounded-xl border bg-card p-4 transition-colors hover:border-primary">
          <p className="text-[13px] font-medium text-muted-foreground">Orders to send</p>
          <p className="mt-1 font-heading text-[28px] font-bold leading-tight">{overview.toPack + overview.packing}</p>
          <p className="text-[13px] text-muted-foreground">{overview.toPack} to pack · {overview.packing} packing</p>
        </Link>
        <Stat label="Sales today" value={money(overview.todaySales.revenueIncGst)} note={`${overview.todaySales.orders} order${overview.todaySales.orders === 1 ? '' : 's'} · inc GST`} />
        <Stat label="This month, profit after marketing" value={money(overview.monthSales.profitAfterMarketingExGst)} tone={overview.monthSales.profitAfterMarketingExGst < 0 ? 'bad' : undefined} note={`from ${money(overview.monthSales.revenueExGst)} sales ex GST`} />
        <Link href="/orders?tab=unpaid" className="rounded-xl border bg-card p-4 transition-colors hover:border-primary">
          <p className="text-[13px] font-medium text-muted-foreground">Checkouts not paid (24 h)</p>
          <p className="mt-1 font-heading text-[28px] font-bold leading-tight">{overview.unpaidCheckoutsToday}</p>
          <p className="text-[13px] text-muted-foreground">{overview.shippedThisWeek} shipped this week</p>
        </Link>
      </div>

      {overview.paymentsNeedingAttention.length > 0 && (
        <div role="alert" className="mb-6 rounded-xl border border-destructive/40 bg-[#fbe9e8] p-4 text-[#7d201c]">
          <p className="flex items-center gap-2 font-semibold"><AlertTriangle className="size-5" aria-hidden="true" /> Payments that need a person</p>
          <ul className="mt-2 grid gap-1 text-sm">
            {overview.paymentsNeedingAttention.map((p) => (
              <li key={`${p.orderNo}-${p.at}`}>
                <Link className="font-semibold underline" href={`/orders/${p.orderNo}`}>{p.orderNo}</Link>{' '}
                {p.status === 'duplicate' ? 'was paid twice: refund one payment in the ' : 'was paid a different amount than the order: check it in the '}
                {p.provider === 'paypal' ? 'PayPal' : 'Stripe'} dashboard ({money(p.amountIncGst)}).
              </li>
            ))}
          </ul>
        </div>
      )}

      <RangeControls range={range} from={report.from} to={report.to} interval={report.interval} />

      <div className="mb-6 grid grid-cols-2 gap-3 lg:grid-cols-3 xl:grid-cols-6">
        <Stat label="Sales" value={moneyShort(t.revenueExGst)} note={`${money(t.revenueIncGst)} inc GST`} />
        <Stat label="Orders" value={t.orders.toLocaleString('en-AU')} note={t.averageOrderIncGst === null ? 'no orders' : `${money(t.averageOrderIncGst)} average`} />
        <Stat label="Cost of parts" value={moneyShort(t.costOfGoodsExGst)} note={`${t.units.toLocaleString('en-AU')} parts sold`} />
        <Stat label="Gross profit" value={moneyShort(t.grossProfitExGst)} note={`${percent(t.grossMarginPct)} margin`} tone={t.grossProfitExGst < 0 ? 'bad' : undefined} />
        <Stat label="Marketing" value={moneyShort(t.marketingExGst)} note={<Link href="/marketing" className="underline">Add spend</Link>} />
        <Stat label="Profit after marketing" value={moneyShort(t.profitAfterMarketingExGst)} tone={t.profitAfterMarketingExGst < 0 ? 'bad' : t.profitAfterMarketingExGst > 0 ? 'good' : undefined} note={t.revenueExGst > 0 ? `${percent((t.profitAfterMarketingExGst / t.revenueExGst) * 100)} of sales` : undefined} />
      </div>

      <Card
        title={report.interval === 'month' ? 'Sales by month' : 'Sales by day'}
        description="Tap a series to show or hide it. Hover or tap a bar for the figures."
        className="mb-6"
      >
        <SalesChart series={report.series} interval={report.interval} />
        {t.linesWithoutCost > 0 && (
          <p className="mt-3 flex items-start gap-2 text-[13px] text-warning">
            <AlertTriangle className="mt-0.5 size-4 shrink-0" aria-hidden="true" />
            {t.linesWithoutCost} sold line{t.linesWithoutCost === 1 ? ' has' : 's have'} no recorded cost, so profit in this period is overstated by their cost.
          </p>
        )}
        <p className="mt-3 flex items-start gap-2 text-[13px] text-muted-foreground">
          <Info className="mt-0.5 size-4 shrink-0" aria-hidden="true" />
          Profit is sales minus what the parts cost from the supplier. What the carrier charges for delivery and card or PayPal fees are not taken off yet.
        </p>
      </Card>

      <div className="grid gap-6 xl:grid-cols-[minmax(0,3fr)_minmax(0,2fr)]">
        <Card title="Best sellers" description={`${report.from === report.to ? report.from : `${report.from} to ${report.to}`}, by sales`} bodyClassName="p-0">
          {report.topProducts.length === 0 ? (
            <p className="p-5 text-sm text-muted-foreground">No sales in this period.</p>
          ) : (
            <div className="table-wrap">
              <table className="data-table">
                <thead><tr><th>Part</th><th className="num">Sold</th><th className="num">Sales inc GST</th><th className="num">Profit ex GST</th></tr></thead>
                <tbody>
                  {report.topProducts.map((p) => (
                    <tr key={`${p.partId}-${p.partNo}`}>
                      <td className="min-w-48">
                        {p.partId ? <Link href={`/products/${p.partId}`} className="font-medium hover:underline">{p.title}</Link> : <span className="font-medium">{p.title}</span>}
                        <span className="block text-xs text-muted-foreground">{p.partNo}</span>
                      </td>
                      <td className="num">{p.units}</td>
                      <td className="num">{money(p.revenueIncGst)}</td>
                      <td className="num">{money(p.profitExGst)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </Card>

        <Card title="Since the store opened" description="Every paid order that still stands.">
          <dl className="grid grid-cols-2 gap-x-4 gap-y-3 text-sm">
            <div><dt className="text-muted-foreground">Sales inc GST</dt><dd className="text-lg font-semibold">{money(all.revenueIncGst)}</dd></div>
            <div><dt className="text-muted-foreground">Sales ex GST</dt><dd className="text-lg font-semibold">{money(all.revenueExGst)}</dd></div>
            <div><dt className="text-muted-foreground">Orders</dt><dd className="text-lg font-semibold">{all.orders.toLocaleString('en-AU')}</dd></div>
            <div><dt className="text-muted-foreground">Gross margin</dt><dd className="text-lg font-semibold">{percent(all.grossMarginPct)}</dd></div>
            <div><dt className="text-muted-foreground">Gross profit</dt><dd className="text-lg font-semibold">{money(all.grossProfitExGst)}</dd></div>
            <div><dt className="text-muted-foreground">Marketing</dt><dd className="text-lg font-semibold">{money(all.marketingExGst)}</dd></div>
            <div className="col-span-2 border-t pt-3">
              <dt className="text-muted-foreground">Profit after marketing</dt>
              <dd className={`font-heading text-3xl font-bold ${all.profitAfterMarketingExGst < 0 ? 'text-destructive' : ''}`}>{money(all.profitAfterMarketingExGst)}</dd>
            </div>
            {report.refunds.orders > 0 && (
              <div className="col-span-2 text-[13px] text-muted-foreground">
                In the selected period {report.refunds.orders} paid order{report.refunds.orders === 1 ? ' was' : 's were'} later refunded or cancelled ({money(report.refunds.totalIncGst)}); they are not counted as sales.
              </div>
            )}
          </dl>
        </Card>
      </div>
    </>
  )
}
