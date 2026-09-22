import type { Metadata } from 'next'
import { adminApi } from '@/lib/api'
import type { Spend } from '@/lib/types'
import { calendarDate, money, today } from '@/lib/format'
import { Card, EmptyState, PageHeader } from '@/components/page'
import { ErrorPanel } from '@/components/ErrorPanel'
import { AddSpend, SpendRow } from '@/components/marketing/SpendForms'

export const metadata: Metadata = { title: 'Marketing' }

export default async function MarketingPage() {
  let data: { items: Spend[]; channels: string[] }
  try {
    data = await adminApi<{ items: Spend[]; channels: string[] }>('/marketing')
  } catch (e) {
    return <><PageHeader title="Marketing" /><ErrorPanel error={e} /></>
  }

  // Newest month first, each with its total.
  const months = new Map<string, Spend[]>()
  for (const s of data.items) {
    const key = s.spentOn.slice(0, 7)
    months.set(key, [...(months.get(key) ?? []), s])
  }
  const day = today()
  const total = (items: Spend[]) => items.reduce((sum, s) => sum + s.amountExGst, 0)
  const byChannel = new Map<string, number>()
  for (const s of data.items) byChannel.set(s.channel, (byChannel.get(s.channel) ?? 0) + s.amountExGst)

  return (
    <>
      <PageHeader title="Marketing" description="Money spent on advertising and promotion. The dashboard takes it off gross profit to show profit after marketing." />

      <Card title="Add spend" className="mb-6">
        <AddSpend channels={data.channels} today={day} />
      </Card>

      {data.items.length === 0 ? (
        <EmptyState title="No marketing spend yet">Add what you spend on ads or promotion to see profit after marketing on the dashboard.</EmptyState>
      ) : (
        <div className="grid gap-6 xl:grid-cols-[minmax(0,2fr)_minmax(280px,1fr)]">
          <div className="grid content-start gap-6">
            {[...months.entries()].map(([month, items]) => (
              <Card key={month} title={calendarDate(`${month}-01`, 'month')} actions={<span className="text-sm font-semibold">{money(total(items))} ex GST</span>} bodyClassName="py-1">
                <ul>{items.map((s) => <SpendRow key={s.id} spend={s} channels={data.channels} today={day} />)}</ul>
              </Card>
            ))}
          </div>
          <Card title="By channel, all time" className="content-start self-start">
            <dl className="divide-y">
              {[...byChannel.entries()].sort((a, b) => b[1] - a[1]).map(([channel, amount]) => (
                <div key={channel} className="flex justify-between gap-4 py-1.5 text-sm">
                  <dt>{channel}</dt><dd className="num font-medium">{money(amount)}</dd>
                </div>
              ))}
              <div className="flex justify-between gap-4 pt-2 text-sm font-bold"><dt>Total ex GST</dt><dd className="num">{money(total(data.items))}</dd></div>
            </dl>
          </Card>
        </div>
      )}
    </>
  )
}
