import { adminApi } from '@/lib/api'
import { requireOwner } from '@/lib/session'
import { csvResponse, toCsv } from '@/lib/csv'
import { shiftDays, today, TIMEZONE } from '@/lib/format'
import type { Breakdown, OrderSummary, Page, SalesReport } from '@/lib/types'

/*
 * Spreadsheet downloads for the owner. Cost and profit are in them, so they
 * are owner-only and never cached.
 *
 *   /export/orders?from=&to=          every paid order in the range
 *   /export/profit?from=&to=&interval= the dashboard's figures per day or month
 *   /export/breakdown?from=&to=&by=   sales by category, brand, supplier or product
 */
const DATE = /^\d{4}-\d{2}-\d{2}$/

type OrderRow = OrderSummary & { subtotalIncGst: number; shippingIncGst: number; gstAmount: number; phone: string; shippingCostExGst?: number | null }

function sydney(value: string | null): string {
  if (!value) return ''
  return new Date(value).toLocaleString('en-AU', { timeZone: TIMEZONE, year: 'numeric', month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit', hour12: false })
}

export async function GET(request: Request, { params }: { params: Promise<{ kind: string }> }) {
  await requireOwner()
  const { kind } = await params
  const url = new URL(request.url)
  const to = DATE.test(url.searchParams.get('to') ?? '') ? url.searchParams.get('to')! : today()
  const from = DATE.test(url.searchParams.get('from') ?? '') ? url.searchParams.get('from')! : shiftDays(to, -29)

  if (kind === 'orders') {
    const rows: OrderRow[] = []
    for (let page = 1; page <= 50; page++) {
      const data = await adminApi<Page<OrderRow>>('/orders', { query: { status: 'all', from, to, page, limit: 200 } })
      rows.push(...data.items.filter((o) => o.paidAt))
      if (page * data.limit >= data.total) break
    }
    const csv = toCsv(
      ['Order', 'Paid (Sydney)', 'Status', 'Customer', 'Email', 'Phone', 'State', 'Postcode', 'Items', 'Products inc GST', 'Delivery charged inc GST', 'Total inc GST', 'GST', 'Delivery cost to us ex GST', 'Paid with', 'Carrier', 'Tracking'],
      rows.map((o) => [o.orderNo, sydney(o.paidAt), o.status, o.customerName, o.email, o.phone, o.state, o.postcode, o.items, o.subtotalIncGst, o.shippingIncGst, o.totalIncGst, o.gstAmount, o.shippingCostExGst ?? '', o.provider ?? '', o.carrier ?? '', o.trackingNumber ?? '']),
    )
    return csvResponse(`orders-${from}-to-${to}.csv`, csv)
  }

  if (kind === 'profit') {
    const interval = url.searchParams.get('interval') === 'month' ? 'month' : 'day'
    const report = await adminApi<SalesReport>('/reports/sales', { query: { from, to, interval } })
    const csv = toCsv(
      [interval === 'month' ? 'Month' : 'Day', 'Orders', 'Parts sold', 'Sales inc GST', 'GST', 'Sales ex GST', 'Delivery charged ex GST', 'Cost of parts ex GST', 'Gross profit', 'Gross margin %', 'Marketing ex GST', 'Delivery cost ex GST', 'Card/PayPal fees (est.)', 'Net profit', 'Net margin %'],
      [...report.series, { ...report.totals, period: 'Total' }].map((p) => [
        p.period, p.orders, p.units, p.revenueIncGst, p.gst, p.revenueExGst, p.deliveryExGst, p.costOfGoodsExGst,
        p.grossProfitExGst, p.grossMarginPct ?? '', p.marketingExGst, p.deliveryCostExGst, p.paymentFeesExGst, p.netProfitExGst, p.netMarginPct ?? '',
      ]),
    )
    return csvResponse(`profit-by-${interval}-${from}-to-${to}.csv`, csv)
  }

  if (kind === 'breakdown') {
    const by = ['category', 'brand', 'supplier', 'product'].includes(url.searchParams.get('by') ?? '') ? url.searchParams.get('by')! : 'category'
    const data = await adminApi<Breakdown>('/reports/breakdown', { query: { from, to, by, limit: 500 } })
    const csv = toCsv(
      [by === 'product' ? 'Part number' : by[0].toUpperCase() + by.slice(1), ...(by === 'product' ? ['Title'] : []), 'Orders', 'Units', 'Sales inc GST', 'Sales ex GST', 'Cost ex GST', 'Profit ex GST', 'Margin %'],
      data.items.map((i) => [i.key, ...(by === 'product' ? [i.label] : []), i.orders, i.units, i.revenueIncGst, i.revenueExGst, i.costExGst ?? '', i.profitExGst ?? '', i.marginPct ?? '']),
    )
    return csvResponse(`sales-by-${by}-${from}-to-${to}.csv`, csv)
  }

  return new Response('Unknown export', { status: 404 })
}
