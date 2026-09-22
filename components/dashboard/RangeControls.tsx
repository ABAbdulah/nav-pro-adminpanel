import Link from 'next/link'
import { cn } from '@/lib/utils'

export type RangeKey = '7d' | '30d' | '90d' | '12m' | 'all' | 'custom'

const PRESETS: { key: Exclude<RangeKey, 'custom'>; label: string }[] = [
  { key: '7d', label: '7 days' },
  { key: '30d', label: '30 days' },
  { key: '90d', label: '90 days' },
  { key: '12m', label: '12 months' },
  { key: 'all', label: 'All time' },
]

const chip = 'inline-flex min-h-10 items-center rounded-lg border px-3 text-sm font-medium transition-colors'
const on = 'border-brand bg-brand text-brand-ink'
const off = 'bg-card hover:bg-secondary'

/**
 * The period the dashboard covers. Plain links and a GET form, so the choice
 * lives in the URL: it survives a reload and can be bookmarked or shared.
 */
export function RangeControls({ range, from, to, interval }: { range: RangeKey; from: string; to: string; interval: 'day' | 'month' }) {
  const keep = (changes: Record<string, string>) => {
    const params = new URLSearchParams(range === 'custom' ? { range, from, to } : { range })
    for (const [k, v] of Object.entries(changes)) params.set(k, v)
    return `/?${params.toString()}`
  }

  return (
    <div className="mb-4 flex flex-wrap items-end gap-x-6 gap-y-3">
      <div>
        <p className="mb-1.5 text-[13px] font-semibold">Period</p>
        <div className="flex flex-wrap gap-2" role="group" aria-label="Period">
          {PRESETS.map((p) => (
            <Link key={p.key} href={`/?range=${p.key}`} aria-current={range === p.key ? 'true' : undefined} className={cn(chip, range === p.key ? on : off)}>
              {p.label}
            </Link>
          ))}
        </div>
      </div>

      <form action="/" className="flex flex-wrap items-end gap-2">
        <input type="hidden" name="range" value="custom" />
        <label className="grid gap-1 text-[13px] font-semibold">
          From
          <input type="date" name="from" defaultValue={from} required className="h-10 rounded-lg border border-input bg-card px-2 text-sm font-normal" />
        </label>
        <label className="grid gap-1 text-[13px] font-semibold">
          To
          <input type="date" name="to" defaultValue={to} required className="h-10 rounded-lg border border-input bg-card px-2 text-sm font-normal" />
        </label>
        <button type="submit" className={cn(chip, range === 'custom' ? on : off)}>Show</button>
      </form>

      <div>
        <p className="mb-1.5 text-[13px] font-semibold">Group by</p>
        <div className="flex gap-2" role="group" aria-label="Group by">
          <Link href={keep({ interval: 'day' })} aria-current={interval === 'day' ? 'true' : undefined} className={cn(chip, interval === 'day' ? on : off)}>Day</Link>
          <Link href={keep({ interval: 'month' })} aria-current={interval === 'month' ? 'true' : undefined} className={cn(chip, interval === 'month' ? on : off)}>Month</Link>
        </div>
      </div>
    </div>
  )
}
