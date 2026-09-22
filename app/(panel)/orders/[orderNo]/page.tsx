import type { Metadata } from 'next'
import Link from 'next/link'
import { notFound } from 'next/navigation'
import { Check, ExternalLink } from 'lucide-react'
import { ApiError, adminApi } from '@/lib/api'
import { requireOperator } from '@/lib/session'
import type { OrderDetail } from '@/lib/types'
import { dateTime, money, percent } from '@/lib/format'
import { Card, PageHeader, Pill, StatusBadge } from '@/components/page'
import { ErrorPanel } from '@/components/ErrorPanel'
import { History } from '@/components/History'
import { OrderActions } from '@/components/orders/OrderActions'
import { cn } from '@/lib/utils'

type Props = { params: Promise<{ orderNo: string }> }

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  return { title: `Order ${(await params).orderNo}` }
}

const PAYMENT_LABEL: Record<string, { label: string; tone: 'good' | 'warn' | 'bad' | 'muted' }> = {
  succeeded: { label: 'Paid', tone: 'good' },
  processing: { label: 'Processing', tone: 'warn' },
  requires_payment_method: { label: 'Not completed', tone: 'muted' },
  failed: { label: 'Declined', tone: 'bad' },
  canceled: { label: 'Cancelled', tone: 'muted' },
  amount_mismatch: { label: 'Wrong amount: check', tone: 'bad' },
  duplicate: { label: 'Paid twice: refund one', tone: 'bad' },
}

/** created → paid → packing → shipped, with the time each happened. */
function Timeline({ order }: { order: OrderDetail }) {
  const packingAt = order.history.find((h) => h.changes?.status?.to === 'packing')?.at ?? null
  const reached = { pending: true, paid: Boolean(order.paidAt), packing: ['packing', 'shipped', 'refunded'].includes(order.status) && Boolean(packingAt ?? order.shippedAt), shipped: Boolean(order.shippedAt) }
  const steps = [
    { label: 'Checkout started', at: order.createdAt, done: reached.pending },
    { label: 'Paid', at: order.paidAt, done: reached.paid },
    { label: 'Packing', at: packingAt, done: reached.packing },
    { label: 'Shipped', at: order.shippedAt, done: reached.shipped },
  ]
  const ended = order.status === 'cancelled' ? { label: 'Cancelled', at: order.cancelledAt } : order.status === 'refunded' ? { label: 'Refunded', at: order.updatedAt } : null

  return (
    <ol className="grid gap-3 sm:grid-cols-4 sm:gap-2">
      {steps.map((s) => (
        <li key={s.label} className="flex items-center gap-3 sm:flex-col sm:items-start sm:gap-1.5">
          <span className={cn('grid size-7 shrink-0 place-items-center rounded-full border-2', s.done ? 'border-success bg-success text-white' : 'border-border bg-card')}>
            {s.done && <Check className="size-4" aria-hidden="true" />}
          </span>
          <div>
            <p className={cn('text-sm font-semibold', !s.done && 'text-muted-foreground')}>{s.label}</p>
            <p className="text-xs text-muted-foreground">{s.done && s.at ? dateTime(s.at) : s.done ? 'Done' : 'Not yet'}</p>
          </div>
        </li>
      ))}
      {ended && <li className="text-sm font-semibold text-destructive sm:col-span-4">{ended.label} {ended.at ? `· ${dateTime(ended.at)}` : ''}</li>}
    </ol>
  )
}

export default async function OrderPage({ params }: Props) {
  const { orderNo } = await params
  const operator = await requireOperator()
  const owner = operator.role === 'owner'
  let order: OrderDetail
  let carriers: string[]
  try {
    ;[order, carriers] = await Promise.all([
      adminApi<OrderDetail>(`/orders/${encodeURIComponent(orderNo)}`),
      adminApi<string[]>('/carriers'),
    ])
  } catch (e) {
    if (e instanceof ApiError && e.status === 404) notFound()
    return <><PageHeader title={`Order ${orderNo}`} back={{ href: '/orders', label: 'Orders' }} /><ErrorPanel error={e} /></>
  }

  const a = order.shipAddress
  const storefront = process.env.STOREFRONT_URL?.replace(/\/$/, '')

  return (
    <>
      <PageHeader
        title={`Order ${order.orderNo}`}
        back={{ href: '/orders', label: 'Orders' }}
        description={<>Placed {dateTime(order.paidAt ?? order.createdAt)} by {order.customerName}</>}
        actions={<StatusBadge status={order.status} />}
      />

      <Card className="mb-6"><Timeline order={order} /></Card>

      <div className="grid gap-6 xl:grid-cols-[minmax(0,2fr)_minmax(320px,1fr)]">
        <div className="grid min-w-0 content-start gap-6">
          <Card title="What to send" description="Order each line from the supplier using its SKU, or take it from your own stock. The customer saw the store’s title, not the supplier’s." bodyClassName="p-0">
            <div className="table-wrap">
              <table className="data-table">
                <thead>
                  <tr>
                    <th>Part, and where to order it</th><th className="num">Qty</th><th className="num">Price</th>
                    {owner && <><th className="num">Cost ex GST</th><th className="num">Profit ex GST</th></>}
                  </tr>
                </thead>
                <tbody>
                  {order.items.map((i, n) => (
                    <tr key={`${i.partNo}-${n}`}>
                      <td className="min-w-60">
                        <div className="flex items-start gap-3">
                          {i.image ? <img src={i.image} alt="" width={44} height={44} className="size-11 shrink-0 rounded-md border object-contain bg-white" /> : <span className="size-11 shrink-0 rounded-md border bg-muted" aria-hidden="true" />}
                          <div className="min-w-0">
                            {i.partId && owner ? <Link href={`/products/${i.partId}`} className="font-medium hover:underline">{i.title}</Link> : <span className="font-medium">{i.title}</span>}
                            <span className="block text-xs text-muted-foreground">{i.brand ? `${i.brand} · ` : ''}{i.partNo}</span>
                            <span className="mt-1 block text-[13px]">
                              Order from <span className="font-semibold">{i.supplier ?? '—'}</span>{i.supplierSku && <> · SKU <span className="font-semibold">{i.supplierSku}</span></>}
                            </span>
                            {i.supplierTitle && <span className="block text-xs text-muted-foreground">{i.supplierTitle}</span>}
                            {i.ownStock && i.ownStock.qty > 0 && (
                              <span className="mt-1 inline-flex rounded-full bg-[#e3f4ec] px-2 py-0.5 text-xs font-semibold text-[#0f6a41]">
                                We hold {i.ownStock.qty}{i.ownStock.location ? ` · ${i.ownStock.location}` : ''}
                              </span>
                            )}
                          </div>
                        </div>
                      </td>
                      <td className="num font-semibold">{i.qty}</td>
                      <td className="num">{money(i.lineIncGst)}<span className="block text-xs text-muted-foreground">{money(i.unitIncGst)} each</span></td>
                      {owner && <><td className="num">{money(i.lineCostExGst)}</td><td className="num">{money(i.lineProfitExGst)}</td></>}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <dl className="grid gap-1 border-t px-4 py-3 text-sm sm:px-5">
              <div className="flex justify-between"><dt className="text-muted-foreground">Subtotal</dt><dd>{money(order.subtotalIncGst)}</dd></div>
              <div className="flex justify-between"><dt className="text-muted-foreground">Delivery · {order.shippingLabel}</dt><dd>{money(order.shippingIncGst)}</dd></div>
              <div className="flex justify-between text-base font-bold"><dt>Total paid</dt><dd>{money(order.totalIncGst)}</dd></div>
              <div className="flex justify-between text-xs text-muted-foreground"><dt>Includes GST</dt><dd>{money(order.gstAmount)}</dd></div>
              {order.profit && (
                <>
                  <div className="mt-2 flex justify-between border-t pt-2"><dt className="text-muted-foreground">Sales ex GST</dt><dd>{money(order.profit.revenueExGst)}</dd></div>
                  <div className="flex justify-between"><dt className="text-muted-foreground">Cost of parts</dt><dd>{money(order.profit.costOfGoodsExGst)}</dd></div>
                  <div className="flex justify-between font-semibold"><dt>Gross profit</dt><dd>{money(order.profit.grossProfitExGst)} <span className="font-normal text-muted-foreground">({percent(order.profit.grossMarginPct)})</span></dd></div>
                  <div className="flex justify-between"><dt className="text-muted-foreground">What delivery cost us</dt><dd>{order.shippingCostExGst === null || order.shippingCostExGst === undefined ? 'not entered' : money(order.shippingCostExGst)}</dd></div>
                </>
              )}
            </dl>
          </Card>

          <Card title="Payments" bodyClassName="p-0">
            {order.payments.length === 0 ? <p className="p-5 text-sm text-muted-foreground">No payment attempts yet.</p> : (
              <div className="table-wrap">
                <table className="data-table">
                  <thead><tr><th>When</th><th>Provider</th><th>Status</th><th className="num">Amount</th><th>Reference</th></tr></thead>
                  <tbody>
                    {order.payments.map((p) => {
                      const s = PAYMENT_LABEL[p.status] ?? { label: p.status, tone: 'muted' as const }
                      return (
                        <tr key={p.intentId}>
                          <td className="whitespace-nowrap">{dateTime(p.createdAt)}</td>
                          <td>{p.provider === 'paypal' ? 'PayPal' : 'Stripe'}</td>
                          <td><Pill tone={s.tone}>{s.label}</Pill>{p.failureMessage && <span className="block text-xs text-muted-foreground">{p.failureMessage}</span>}</td>
                          <td className="num">{money(p.amountIncGst)}</td>
                          <td className="max-w-48 truncate text-xs text-muted-foreground" title={p.captureId ?? p.intentId}>{p.captureId ?? p.intentId}</td>
                        </tr>
                      )
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </Card>

          <Card title="History" description="Every change made in the admin panel, newest first.">
            <History
              entries={order.history}
              labels={{ status: 'Status', carrier: 'Carrier', tracking_number: 'Tracking number', admin_notes: 'Internal notes', shipping_cost_ex_gst: 'Delivery cost' }}
            />
          </Card>
        </div>

        <div className="grid content-start gap-6">
          <OrderActions order={order} carriers={carriers} owner={owner} />

          <Card title="Customer">
            <p className="font-semibold">{order.customerName}</p>
            <p className="text-sm"><a className="text-action-text underline" href={`mailto:${order.email}`}>{order.email}</a></p>
            <p className="text-sm"><a className="text-action-text underline" href={`tel:${order.phone.replace(/\s/g, '')}`}>{order.phone}</a></p>
            <p className="mt-1 text-xs text-muted-foreground">{order.userId ? 'Has a store account' : 'Checked out as a guest'}{order.abn ? ` · ABN ${order.abn}` : ''}</p>
            {owner && (
              <Link href={`/customers/${encodeURIComponent(order.email)}`} className="mt-1 inline-flex min-h-9 items-center text-sm font-medium text-action-text underline">
                All orders from this customer
              </Link>
            )}
            <h3 className="mt-4 text-sm font-semibold">Deliver to</h3>
            <address className="text-sm not-italic leading-relaxed">
              {[a.fullName, a.company, a.street1, a.street2, `${a.suburb} ${a.state} ${a.postcode}`].filter(Boolean).map((line) => <span key={line} className="block">{line}</span>)}
            </address>
            {order.customerNotes && (
              <div className="mt-4 rounded-lg bg-[#fff4d6] p-3 text-sm text-[#5c3c08]">
                <p className="font-semibold">Note from the customer</p>
                <p className="whitespace-pre-wrap">{order.customerNotes}</p>
              </div>
            )}
          </Card>

          {order.trackingNumber && (
            <Card title="Tracking">
              <p className="text-sm">{order.carrier ?? 'Carrier not set'} · <span className="font-semibold">{order.trackingNumber}</span></p>
              {order.trackingUrl && (
                <a href={order.trackingUrl} target="_blank" rel="noreferrer" className="mt-2 inline-flex min-h-10 items-center gap-2 text-sm font-medium text-action-text underline">
                  Open the carrier’s tracking page <ExternalLink className="size-4" aria-hidden="true" />
                </a>
              )}
              {storefront && <p className="mt-2 text-xs text-muted-foreground">The customer sees this on their order page at {storefront.replace(/^https?:\/\//, '')} when signed in.</p>}
            </Card>
          )}
        </div>
      </div>
    </>
  )
}
