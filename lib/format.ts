import type { OrderStatus } from './types'

export const TIMEZONE = 'Australia/Sydney'

const aud = new Intl.NumberFormat('en-AU', { style: 'currency', currency: 'AUD' })
const audWhole = new Intl.NumberFormat('en-AU', { style: 'currency', currency: 'AUD', maximumFractionDigits: 0 })

export function money(n: number | null | undefined): string {
  return n === null || n === undefined ? '—' : aud.format(n)
}

/** Whole dollars for chart axes and big headline numbers. */
export function moneyShort(n: number): string {
  if (Math.abs(n) >= 100_000) return `$${(n / 1000).toFixed(0)}k`
  if (Math.abs(n) >= 10_000) return `$${(n / 1000).toFixed(1)}k`
  return audWhole.format(n)
}

export function percent(n: number | null | undefined): string {
  return n === null || n === undefined ? '—' : `${n.toFixed(1)}%`
}

export function dateTime(value: string | null | undefined): string {
  if (!value) return '—'
  return new Date(value).toLocaleString('en-AU', { timeZone: TIMEZONE, day: 'numeric', month: 'short', year: 'numeric', hour: 'numeric', minute: '2-digit' })
}

export function date(value: string | null | undefined): string {
  if (!value) return '—'
  return new Date(value).toLocaleDateString('en-AU', { timeZone: TIMEZONE, day: 'numeric', month: 'short', year: 'numeric' })
}

/** A YYYY-MM-DD calendar date (no time zone shift). */
export function calendarDate(value: string, style: 'day' | 'month' = 'day'): string {
  const d = new Date(`${value}T00:00:00Z`)
  return style === 'month'
    ? d.toLocaleDateString('en-AU', { timeZone: 'UTC', month: 'short', year: 'numeric' })
    : d.toLocaleDateString('en-AU', { timeZone: 'UTC', day: 'numeric', month: 'short' })
}

/** "3 hours ago", for queues where age matters more than the exact time. */
export function ago(value: string | null | undefined): string {
  if (!value) return '—'
  const minutes = Math.round((Date.now() - new Date(value).getTime()) / 60_000)
  if (minutes < 1) return 'just now'
  if (minutes < 60) return `${minutes} min ago`
  const hours = Math.round(minutes / 60)
  if (hours < 24) return `${hours} h ago`
  const days = Math.round(hours / 24)
  return `${days} day${days === 1 ? '' : 's'} ago`
}

/** Today in Sydney as YYYY-MM-DD. */
export function today(): string {
  return new Intl.DateTimeFormat('en-CA', { timeZone: TIMEZONE, year: 'numeric', month: '2-digit', day: '2-digit' }).format(new Date())
}

export function shiftDays(ymd: string, days: number): string {
  const d = new Date(`${ymd}T00:00:00Z`)
  d.setUTCDate(d.getUTCDate() + days)
  return d.toISOString().slice(0, 10)
}

export const STATUS_LABEL: Record<OrderStatus, string> = {
  pending: 'Not paid',
  paid: 'To pack',
  packing: 'Packing',
  shipped: 'Shipped',
  cancelled: 'Cancelled',
  refunded: 'Refunded',
}

/** What the button that moves an order to each status says. */
export const STATUS_ACTION: Record<OrderStatus, string> = {
  pending: 'Mark not paid',
  paid: 'Mark paid',
  packing: 'Start packing',
  shipped: 'Mark shipped',
  cancelled: 'Cancel order',
  refunded: 'Record refund',
}

export const STOCK_LABEL: Record<string, string> = { in: 'In stock', low: 'Low stock', out: 'Out of stock' }
