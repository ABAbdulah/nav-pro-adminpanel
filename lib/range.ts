import type { RangeKey } from '@/components/dashboard/RangeControls'
import { shiftDays, today } from './format'

export type RangeSearch = { range?: string; from?: string; to?: string; interval?: string }

const DATE = /^\d{4}-\d{2}-\d{2}$/
const RANGES: RangeKey[] = ['7d', '30d', '90d', '12m', 'all', 'custom']

function monthsBack(ymd: string, months: number): string {
  const d = new Date(`${ymd.slice(0, 7)}-01T00:00:00Z`)
  d.setUTCMonth(d.getUTCMonth() - months)
  return d.toISOString().slice(0, 10)
}

/**
 * The dates a report covers, from the URL. Defaults to the last 30 days.
 * "All time" needs the first sale's date (YYYY-MM-DD), which the caller passes
 * once it knows it.
 */
export function resolveRange(search: RangeSearch, firstSale: string | null = null) {
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
