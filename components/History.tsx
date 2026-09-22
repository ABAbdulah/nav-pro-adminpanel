import { dateTime, STATUS_LABEL } from '@/lib/format'
import type { HistoryEntry, OrderStatus } from '@/lib/types'

function show(field: string, value: unknown): string {
  if (value === null || value === undefined || value === '') return 'empty'
  if (field === 'status' && typeof value === 'string' && value in STATUS_LABEL) return STATUS_LABEL[value as OrderStatus]
  if (field === 'is_published') return value === true || value === 'true' ? 'shown' : 'hidden'
  if (field === 'sell_inc_gst' || field === 'amount_ex_gst' || field === 'gst') return `$${Number(value).toFixed(2)}`
  const text = String(value)
  return text.length > 80 ? `${text.slice(0, 80)}…` : text
}

/** Who changed what, newest first. labels maps stored field names to words. */
export function History({ entries, labels }: { entries: HistoryEntry[]; labels: Record<string, string> }) {
  if (entries.length === 0) return <p className="text-sm text-muted-foreground">No changes made in the admin panel yet.</p>
  return (
    <ol className="grid gap-3">
      {entries.map((entry, i) => (
        <li key={`${entry.at}-${i}`} className="border-l-2 pl-3 text-sm [overflow-wrap:anywhere]">
          <p className="text-xs text-muted-foreground">{dateTime(entry.at)} · {entry.actor ?? 'unknown'}</p>
          {entry.action === 'create' && <p>Created</p>}
          {entry.action === 'delete' && <p>Deleted</p>}
          {entry.action === 'update' && entry.changes && (
            <ul>
              {Object.entries(entry.changes).map(([field, change]) => (
                <li key={field}>
                  <span className="font-medium">{labels[field] ?? field}</span>: {show(field, change.from)} → <span className="font-medium">{show(field, change.to)}</span>
                </li>
              ))}
            </ul>
          )}
        </li>
      ))}
    </ol>
  )
}
