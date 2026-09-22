import type { Metadata } from 'next'
import { notFound } from 'next/navigation'
import { ExternalLink } from 'lucide-react'
import { ApiError, adminApi } from '@/lib/api'
import type { ProductDetail } from '@/lib/types'
import { date, dateTime, money, percent, STOCK_LABEL } from '@/lib/format'
import { Card, PageHeader, Pill } from '@/components/page'
import { ErrorPanel } from '@/components/ErrorPanel'
import { History } from '@/components/History'
import { ProductEditor } from '@/components/products/ProductEditor'

type Props = { params: Promise<{ id: string }> }

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  return { title: `Product ${(await params).id}` }
}

const FIELD_LABELS = {
  title: 'Title', description: 'Description', sell_inc_gst: 'Price', image_url: 'Photo', is_published: 'Show on store', notes: 'Internal notes',
}

function Row({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="flex items-baseline justify-between gap-4 py-1.5">
      <dt className="text-sm text-muted-foreground">{label}</dt>
      <dd className="text-right text-sm font-medium">{children}</dd>
    </div>
  )
}

export default async function ProductPage({ params }: Props) {
  const id = Number((await params).id)
  if (!Number.isSafeInteger(id) || id <= 0) notFound()

  let product: ProductDetail
  try {
    product = await adminApi<ProductDetail>(`/products/${id}`)
  } catch (e) {
    if (e instanceof ApiError && e.status === 404) notFound()
    return <><PageHeader title="Product" back={{ href: '/products', label: 'Products' }} /><ErrorPanel error={e} /></>
  }

  const { current, supplier, pricing } = product

  return (
    <>
      <PageHeader
        title={current.title}
        back={{ href: '/products', label: 'Products' }}
        description={<>Part {product.partNo}{current.brand ? ` · ${current.brand}` : ''}{product.productType ? ` · ${product.productType}` : ''}</>}
        actions={
          <>
            {current.published ? <Pill tone="good">Shown on the store</Pill> : <Pill tone="bad">Hidden from the store</Pill>}
            {product.storefrontUrl && current.published && (
              <a href={product.storefrontUrl} target="_blank" rel="noreferrer" className="inline-flex min-h-10 items-center gap-2 rounded-lg border bg-card px-3 text-sm font-medium hover:bg-secondary">
                View on the store <ExternalLink className="size-4" aria-hidden="true" />
              </a>
            )}
          </>
        }
      />
      {current.published && !current.live && (
        <p role="status" className="mb-4 rounded-lg bg-[#fff4d6] px-3 py-2 text-sm text-[#5c3c08]">The storefront is still updating with the latest change. It usually takes less than a minute.</p>
      )}

      <div className="grid gap-6 xl:grid-cols-[minmax(0,3fr)_minmax(320px,2fr)]">
        <Card className="self-start" title="Edit what customers see" description={product.override.updatedAt ? `Last changed ${dateTime(product.override.updatedAt)}${product.override.updatedBy ? ` by ${product.override.updatedBy}` : ''}` : 'Showing the supplier’s details. Nothing has been changed yet.'}>
          <ProductEditor product={product} />
        </Card>

        <div className="grid content-start gap-6">
          <Card title="Price and margin">
            <dl className="divide-y">
              <Row label="Cost from supplier, ex GST">{money(pricing.costExGst)}</Row>
              <Row label="Cost from supplier, inc GST">{money(pricing.costIncGst)}</Row>
              <Row label="Supplier’s RRP, inc GST">{money(pricing.rrpIncGst)}</Row>
              <Row label="Our price, inc GST"><span className="text-base">{money(pricing.sellIncGst)}</span></Row>
              <Row label="Profit per sale, ex GST">{money(pricing.marginDollarsExGst)}</Row>
              <Row label="Margin at our price">{percent(pricing.marginPct)}</Row>
              <Row label="Margin at RRP">{percent(pricing.rrpMarginPct)}</Row>
            </dl>
            {pricing.history.length > 1 && (
              <details className="mt-3 text-sm">
                <summary className="min-h-9 font-medium text-action-text">Price history from the supplier</summary>
                <table className="data-table mt-2">
                  <thead><tr><th>Seen</th><th className="num">Cost ex GST</th><th className="num">RRP</th></tr></thead>
                  <tbody>{pricing.history.map((h) => <tr key={h.at}><td>{date(h.at)}</td><td className="num">{money(h.costExGst)}</td><td className="num">{money(h.rrpIncGst)}</td></tr>)}</tbody>
                </table>
              </details>
            )}
          </Card>

          <Card title="From the supplier" description="What to order, and the supplier’s own wording. Customers never see this.">
            <dl className="divide-y">
              <Row label="Supplier">{supplier.name}</Row>
              <Row label="Supplier SKU">{supplier.sku ?? '—'}</Row>
              <Row label="Supplier brand">{supplier.brand ?? '—'}</Row>
            </dl>
            <p className="mt-3 text-sm font-medium">{supplier.title}</p>
            {supplier.description && supplier.description !== supplier.title && <p className="mt-1 whitespace-pre-wrap text-sm text-muted-foreground">{supplier.description}</p>}
            {supplier.comments && <p className="mt-2 text-sm text-muted-foreground">Supplier note: {supplier.comments}</p>}
          </Card>

          <Card title="Stock and sales">
            <dl className="divide-y">
              <Row label="Supplier stock">{STOCK_LABEL[current.stock] ?? current.stock}{product.stock?.warehouse !== null && product.stock?.warehouse !== undefined ? ` (${product.stock.warehouse} in warehouse)` : ''}</Row>
              <Row label="Sold through the store">{product.sales.units} in {product.sales.orders} order{product.sales.orders === 1 ? '' : 's'}</Row>
              <Row label="Sales, inc GST">{money(product.sales.revenueIncGst)}</Row>
            </dl>
            {product.stock && <p className="mt-2 text-xs text-muted-foreground">Stock last checked {date(product.stock.at)}. It is the supplier’s figure, not ours.</p>}
            {product.categories.length > 0 && (
              <p className="mt-3 text-sm text-muted-foreground">Listed under {product.categories.map((c) => c.category).join(', ')}.</p>
            )}
          </Card>

          <Card title="Change history">
            <History entries={product.history} labels={FIELD_LABELS} />
          </Card>
        </div>
      </div>
    </>
  )
}
