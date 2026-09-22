import Link from 'next/link'
import { ChevronLeft, ChevronRight } from 'lucide-react'
import { cn } from '@/lib/utils'
import { STATUS_LABEL } from '@/lib/format'
import type { OrderStatus } from '@/lib/types'

export function PageHeader({ title, description, actions, back }: {
  title: string
  description?: React.ReactNode
  actions?: React.ReactNode
  back?: { href: string; label: string }
}) {
  return (
    <header className="mb-6">
      {back && (
        <Link href={back.href} className="mb-2 inline-flex min-h-9 items-center gap-1 text-sm font-medium text-action-text hover:underline">
          <ChevronLeft className="size-4" aria-hidden="true" /> {back.label}
        </Link>
      )}
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div className="min-w-0">
          <h1 className="text-3xl font-bold leading-tight sm:text-[34px]">{title}</h1>
          {description && <p className="mt-1 text-sm text-muted-foreground">{description}</p>}
        </div>
        {actions && <div className="flex flex-wrap items-center gap-2">{actions}</div>}
      </div>
    </header>
  )
}

export function Card({ title, description, actions, children, className, bodyClassName }: {
  title?: React.ReactNode
  description?: React.ReactNode
  actions?: React.ReactNode
  children: React.ReactNode
  className?: string
  bodyClassName?: string
}) {
  return (
    <section className={cn('min-w-0 rounded-xl border bg-card', className)}>
      {(title || actions) && (
        <div className="flex flex-wrap items-start justify-between gap-3 border-b px-4 py-3 sm:px-5">
          <div className="min-w-0">
            {title && <h2 className="text-lg font-bold leading-snug">{title}</h2>}
            {description && <p className="text-[13px] text-muted-foreground">{description}</p>}
          </div>
          {actions}
        </div>
      )}
      <div className={cn('p-4 sm:p-5', bodyClassName)}>{children}</div>
    </section>
  )
}

const STATUS_STYLE: Record<OrderStatus, string> = {
  pending: 'bg-muted text-muted-foreground',
  paid: 'bg-[#fdeee6] text-[#8f2f0b]',
  packing: 'bg-[#fff4d6] text-[#7a4f0a]',
  shipped: 'bg-[#e3f4ec] text-[#0f6a41]',
  cancelled: 'bg-muted text-muted-foreground line-through decoration-1',
  refunded: 'bg-[#f0eafb] text-[#5a3fa6]',
}

export function StatusBadge({ status }: { status: OrderStatus }) {
  return <span className={cn('inline-flex rounded-full px-2.5 py-0.5 text-xs font-semibold whitespace-nowrap', STATUS_STYLE[status])}>{STATUS_LABEL[status]}</span>
}

export function Pill({ tone = 'muted', children }: { tone?: 'muted' | 'good' | 'warn' | 'bad' | 'info'; children: React.ReactNode }) {
  const tones = {
    muted: 'bg-muted text-muted-foreground',
    good: 'bg-[#e3f4ec] text-[#0f6a41]',
    warn: 'bg-[#fff4d6] text-[#7a4f0a]',
    bad: 'bg-[#fbe9e8] text-[#9c2823]',
    info: 'bg-[#e4eff3] text-[#0e3a47]',
  }
  return <span className={cn('inline-flex rounded-full px-2 py-0.5 text-xs font-semibold whitespace-nowrap', tones[tone])}>{children}</span>
}

export function EmptyState({ title, children }: { title: string; children?: React.ReactNode }) {
  return (
    <div className="rounded-xl border border-dashed bg-card px-6 py-12 text-center">
      <p className="text-lg font-semibold">{title}</p>
      {children && <div className="mt-1 text-sm text-muted-foreground">{children}</div>}
    </div>
  )
}

/** Previous / next links that keep the rest of the query string. */
export function Pagination({ page, limit, total, href }: { page: number; limit: number; total: number; href: (page: number) => string }) {
  const pages = Math.max(1, Math.ceil(total / limit))
  if (pages <= 1) return null
  const link = 'inline-flex min-h-10 items-center gap-1 rounded-lg border bg-card px-3 text-sm font-medium hover:bg-secondary'
  return (
    <nav aria-label="Pages" className="mt-4 flex flex-wrap items-center justify-between gap-3 text-sm">
      <span className="text-muted-foreground">Page {page.toLocaleString('en-AU')} of {pages.toLocaleString('en-AU')} · {total.toLocaleString('en-AU')} in total</span>
      <div className="flex gap-2">
        {page > 1 ? <Link className={link} href={href(page - 1)}><ChevronLeft className="size-4" aria-hidden="true" /> Previous</Link> : null}
        {page < pages ? <Link className={link} href={href(page + 1)}>Next <ChevronRight className="size-4" aria-hidden="true" /></Link> : null}
      </div>
    </nav>
  )
}

/** A query string from the current params with some keys changed (undefined removes one). */
export function withParams(base: string, params: Record<string, string | undefined>, changes: Record<string, string | number | undefined>) {
  const next = new URLSearchParams()
  for (const [k, v] of Object.entries({ ...params, ...changes })) {
    if (v !== undefined && v !== '') next.set(k, String(v))
  }
  const qs = next.toString()
  return qs ? `${base}?${qs}` : base
}
