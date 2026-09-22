import type { Metadata } from 'next'
import Link from 'next/link'
import { ImageOff, Search } from 'lucide-react'
import { adminApi } from '@/lib/api'
import { requireOwner } from '@/lib/session'
import type { Page, ProductRow } from '@/lib/types'
import { money, percent, STOCK_LABEL } from '@/lib/format'
import { EmptyState, PageHeader, Pagination, Pill, withParams } from '@/components/page'
import { ErrorPanel } from '@/components/ErrorPanel'
import { BULK_FORM, BulkBar } from '@/components/products/BulkBar'

export const metadata: Metadata = { title: 'Products' }

type Search = { q?: string; supplier?: string; status?: string; photo?: string; sort?: string; page?: string }

const STATUS = [
  { value: 'all', label: 'All products' },
  { value: 'published', label: 'Shown on the store' },
  { value: 'hidden', label: 'Hidden from the store' },
  { value: 'edited', label: 'Changed in the panel' },
  { value: 'stocked', label: 'Held in our own stock' },
]
const PHOTO = [
  { value: 'any', label: 'With or without a photo' },
  { value: 'with', label: 'With a photo' },
  { value: 'without', label: 'Without a photo' },
]
const SORT = [
  { value: 'partNo', label: 'Part number' },
  { value: 'updated', label: 'Recently changed' },
  { value: 'price_desc', label: 'Price, high to low' },
  { value: 'price_asc', label: 'Price, low to high' },
  { value: 'margin_asc', label: 'Margin, thinnest first' },
  { value: 'margin_desc', label: 'Margin, widest first' },
]

function Select({ name, label, value, options }: { name: string; label: string; value: string; options: { value: string; label: string }[] }) {
  return (
    <label className="grid min-w-0 gap-1 text-[13px] font-semibold">
      {label}
      <select name={name} defaultValue={value} className="h-10 min-w-0 rounded-lg border border-input bg-card px-2 text-sm font-normal">
        {options.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
      </select>
    </label>
  )
}

function marginTone(m: number | null): 'good' | 'warn' | 'bad' | 'muted' {
  if (m === null) return 'muted'
  if (m < 0) return 'bad'
  if (m < 15) return 'warn'
  return 'good'
}

export default async function ProductsPage({ searchParams }: { searchParams: Promise<Search> }) {
  await requireOwner()
  const search = await searchParams
  const page = Math.max(1, Number(search.page) || 1)
  const filters = {
    q: search.q?.trim() || undefined,
    supplier: search.supplier || undefined,
    status: STATUS.some((s) => s.value === search.status) ? search.status : undefined,
    photo: PHOTO.some((s) => s.value === search.photo) ? search.photo : undefined,
    sort: SORT.some((s) => s.value === search.sort) ? search.sort : undefined,
  }

  let data: Page<ProductRow>
  let suppliers: { supplier: string; parts: number }[]
  try {
    ;[data, suppliers] = await Promise.all([
      adminApi<Page<ProductRow>>('/products', { query: { ...filters, page, limit: 50 } }),
      adminApi<{ supplier: string; parts: number }[]>('/suppliers'),
    ])
  } catch (e) {
    return <><PageHeader title="Products" /><ErrorPanel error={e} /></>
  }

  return (
    <>
      <PageHeader title="Products" description="Every part in the catalogue with what it costs us, its RRP and what we sell it for. Open one to change its title, description, price or photo." />

      <form action="/products" className="mb-4 grid gap-3 rounded-xl border bg-card p-4 sm:grid-cols-2 lg:grid-cols-[minmax(0,2fr)_repeat(4,minmax(0,1fr))_auto] lg:items-end" role="search">
        <label className="grid min-w-0 gap-1 text-[13px] font-semibold sm:col-span-2 lg:col-span-1">
          Search
          <input name="q" defaultValue={filters.q} placeholder="Part number, SKU or title" className="h-10 min-w-0 rounded-lg border border-input bg-card px-3 text-sm font-normal" />
        </label>
        <Select name="supplier" label="Supplier" value={filters.supplier ?? ''} options={[{ value: '', label: 'Every supplier' }, ...suppliers.map((s) => ({ value: s.supplier, label: `${s.supplier} (${s.parts.toLocaleString('en-AU')})` }))]} />
        <Select name="status" label="Show" value={filters.status ?? 'all'} options={STATUS} />
        <Select name="photo" label="Photo" value={filters.photo ?? 'any'} options={PHOTO} />
        <Select name="sort" label="Sort by" value={filters.sort ?? 'partNo'} options={SORT} />
        <button type="submit" className="inline-flex h-10 items-center justify-center gap-2 rounded-lg bg-brand px-4 text-sm font-medium text-brand-ink sm:col-span-2 lg:col-span-1">
          <Search className="size-4" aria-hidden="true" /> Show
        </button>
      </form>

      <p className="mb-3 text-sm text-muted-foreground">{data.total.toLocaleString('en-AU')} product{data.total === 1 ? '' : 's'}. Cost is ex GST; RRP and our price include GST. Margin is on our price ex GST.</p>

      {data.items.length > 0 && <BulkBar />}

      {data.items.length === 0 ? (
        <EmptyState title="No products match">Try fewer words, or a different filter.</EmptyState>
      ) : (
        <>
          <ul className="grid gap-2 md:hidden">
            {data.items.map((p) => (
              <li key={p.id} className="flex items-start gap-2">
                <input type="checkbox" name="ids" value={p.id} form={BULK_FORM} className="mt-5 size-5 shrink-0" aria-label={`Tick ${p.partNo}`} />
                <Link href={`/products/${p.id}`} className="flex min-w-0 flex-1 gap-3 rounded-xl border bg-card p-3 active:bg-secondary">
                  {p.image ? <img src={p.image} alt="" width={64} height={64} loading="lazy" className="size-16 shrink-0 rounded-md border bg-white object-contain" /> : <span className="grid size-16 shrink-0 place-items-center rounded-md border bg-muted text-muted-foreground"><ImageOff className="size-5" aria-hidden="true" /></span>}
                  <div className="min-w-0 flex-1">
                    <p className="line-clamp-2 font-medium leading-snug">{p.title}</p>
                    <p className="text-xs text-muted-foreground">{p.partNo} · {p.supplier} {p.supplierSku}</p>
                    <p className="mt-1 flex flex-wrap gap-x-3 text-[13px]">
                      <span>Cost {money(p.costExGst)}</span><span>RRP {money(p.rrpIncGst)}</span><span className="font-semibold">Ours {money(p.sellIncGst)}</span>
                    </p>
                    <div className="mt-1 flex flex-wrap gap-1">
                      <Pill tone={marginTone(p.marginPct)}>{percent(p.marginPct)} margin</Pill>
                      {!p.published && <Pill tone="bad">Hidden</Pill>}
                      {p.edited && <Pill tone="info">Changed</Pill>}
                      {p.ownStock !== null && <Pill tone="good">We hold {p.ownStock}</Pill>}
                    </div>
                  </div>
                </Link>
              </li>
            ))}
          </ul>

          <div className="table-wrap hidden rounded-xl border bg-card md:block">
            <table className="data-table">
              <thead>
                <tr>
                  <th className="w-10"><input type="checkbox" data-select-all="true" className="size-4" aria-label="Tick every product on this page" /></th>
                  <th><span className="sr-only">Photo</span></th><th>Product</th><th>Supplier</th>
                  <th className="num">Cost ex GST</th><th className="num">RRP</th><th className="num">Our price</th><th className="num">Margin</th><th>Stock</th><th>Store</th>
                </tr>
              </thead>
              <tbody>
                {data.items.map((p) => (
                  <tr key={p.id}>
                    <td><input type="checkbox" name="ids" value={p.id} form={BULK_FORM} className="size-4" aria-label={`Tick ${p.partNo}`} /></td>
                    <td className="w-14">
                      {p.image ? <img src={p.image} alt="" width={44} height={44} loading="lazy" className="size-11 rounded-md border bg-white object-contain" /> : <span className="grid size-11 place-items-center rounded-md border bg-muted text-muted-foreground" title="No photo"><ImageOff className="size-4" aria-hidden="true" /></span>}
                    </td>
                    <td className="min-w-64 max-w-md">
                      <Link href={`/products/${p.id}`} className="line-clamp-2 font-medium text-action-text hover:underline">{p.title}</Link>
                      <span className="block text-xs text-muted-foreground">{p.partNo}{p.brand ? ` · ${p.brand}` : ''}</span>
                    </td>
                    <td className="min-w-44 max-w-64">
                      <span className="font-medium">{p.supplier}</span> <span className="text-xs text-muted-foreground">{p.supplierSku}</span>
                      <span className="block truncate text-xs text-muted-foreground" title={p.supplierTitle ?? ''}>{p.supplierTitle}</span>
                    </td>
                    <td className="num">{money(p.costExGst)}</td>
                    <td className="num">{money(p.rrpIncGst)}</td>
                    <td className="num font-semibold">{money(p.sellIncGst)}</td>
                    <td className="num"><Pill tone={marginTone(p.marginPct)}>{percent(p.marginPct)}</Pill></td>
                    <td className="whitespace-nowrap text-[13px]">
                      {p.stock ? STOCK_LABEL[p.stock] ?? p.stock : '—'}
                      {p.ownStock !== null && <span className="block text-xs font-semibold text-success">We hold {p.ownStock}</span>}
                    </td>
                    <td className="whitespace-nowrap">
                      {p.published ? <Pill tone="good">Shown</Pill> : <Pill tone="bad">Hidden</Pill>}
                      {p.edited && <span className="ml-1"><Pill tone="info">Changed</Pill></span>}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <Pagination page={data.page} limit={data.limit} total={data.total} href={(n) => withParams('/products', filters, { page: n })} />
        </>
      )}
    </>
  )
}
