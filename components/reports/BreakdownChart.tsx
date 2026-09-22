'use client'

import { Bar, BarChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts'
import type { Breakdown } from '@/lib/types'
import { money, moneyShort, percent } from '@/lib/format'

type Item = Breakdown['items'][number]

function Tip({ active, payload }: { active?: boolean; payload?: { payload: Item }[] }) {
  if (!active || !payload?.length) return null
  const i = payload[0].payload
  return (
    <div className="min-w-48 rounded-lg border bg-card p-3 text-[13px] shadow-lg">
      <p className="mb-1 font-semibold">{i.label}</p>
      <dl className="grid grid-cols-[1fr_auto] gap-x-4">
        <dt className="text-muted-foreground">Sales ex GST</dt><dd className="num">{money(i.revenueExGst)}</dd>
        <dt className="text-muted-foreground">Profit ex GST</dt><dd className="num">{money(i.profitExGst)}</dd>
        <dt className="text-muted-foreground">Margin</dt><dd className="num">{percent(i.marginPct)}</dd>
        <dt className="text-muted-foreground">Units</dt><dd className="num">{i.units}</dd>
      </dl>
    </div>
  )
}

/** The top ten, sales against profit, as horizontal bars that fit a phone. */
export function BreakdownChart({ items }: { items: Item[] }) {
  const top = items.slice(0, 10).map((i) => ({ ...i, short: i.label.length > 22 ? `${i.label.slice(0, 21)}…` : i.label }))
  if (top.length === 0) return <p className="text-sm text-muted-foreground">No sales in this period.</p>
  return (
    <div style={{ height: Math.max(220, top.length * 44) }} className="w-full">
      <ResponsiveContainer width="100%" height="100%">
        <BarChart data={top} layout="vertical" margin={{ top: 4, right: 12, bottom: 4, left: 4 }} barGap={2}>
          <CartesianGrid horizontal={false} stroke="var(--border)" />
          <XAxis type="number" tickFormatter={(v: number) => moneyShort(v)} tick={{ fontSize: 12, fill: 'var(--muted-foreground)' }} axisLine={false} tickLine={false} />
          <YAxis type="category" dataKey="short" width={140} tick={{ fontSize: 12, fill: 'var(--foreground)' }} axisLine={false} tickLine={false} />
          <Tooltip content={(p) => <Tip active={p.active} payload={p.payload as unknown as { payload: Item }[]} />} cursor={{ fill: 'rgba(14,58,71,.06)' }} />
          <Bar dataKey="revenueExGst" name="Sales ex GST" fill="var(--chart-revenue)" radius={[0, 3, 3, 0]} isAnimationActive={false} />
          <Bar dataKey="profitExGst" name="Profit ex GST" fill="var(--chart-profit)" radius={[0, 3, 3, 0]} isAnimationActive={false} />
        </BarChart>
      </ResponsiveContainer>
    </div>
  )
}
