'use client'

import { useState } from 'react'
import { Bar, CartesianGrid, ComposedChart, Line, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts'
import { calendarDate, money, moneyShort, percent } from '@/lib/format'
import type { Figures } from '@/lib/types'
import { cn } from '@/lib/utils'

type Point = Figures & { period: string }
type Key = 'revenueExGst' | 'costOfGoodsExGst' | 'grossProfitExGst' | 'marketingExGst' | 'netProfitExGst' | 'orders'

const SERIES: { key: Key; label: string; color: string; kind: 'bar' | 'line'; axis: 'money' | 'count'; on: boolean }[] = [
  { key: 'revenueExGst', label: 'Sales', color: 'var(--chart-revenue)', kind: 'bar', axis: 'money', on: true },
  { key: 'costOfGoodsExGst', label: 'Cost of parts', color: 'var(--chart-cost)', kind: 'bar', axis: 'money', on: false },
  { key: 'grossProfitExGst', label: 'Gross profit', color: 'var(--chart-profit)', kind: 'line', axis: 'money', on: true },
  { key: 'marketingExGst', label: 'Marketing', color: 'var(--chart-marketing)', kind: 'line', axis: 'money', on: true },
  { key: 'netProfitExGst', label: 'Net profit', color: 'var(--chart-net)', kind: 'line', axis: 'money', on: false },
  { key: 'orders', label: 'Orders', color: '#8a5a12', kind: 'line', axis: 'count', on: false },
]

function ChartTooltip({ active, payload, interval }: { active?: boolean; payload?: { payload: Point }[]; interval: 'day' | 'month' }) {
  if (!active || !payload?.length) return null
  const p = payload[0].payload
  return (
    <div className="min-w-52 rounded-lg border bg-card p-3 text-[13px] shadow-lg">
      <p className="mb-1.5 font-semibold">{calendarDate(p.period, interval === 'month' ? 'month' : 'day')}{interval === 'day' ? ` ${p.period.slice(0, 4)}` : ''}</p>
      <dl className="grid grid-cols-[1fr_auto] gap-x-4 gap-y-0.5">
        <dt className="text-muted-foreground">Orders</dt><dd className="num">{p.orders}</dd>
        <dt className="text-muted-foreground">Sales ex GST</dt><dd className="num">{money(p.revenueExGst)}</dd>
        <dt className="text-muted-foreground">Cost of parts</dt><dd className="num">{money(p.costOfGoodsExGst)}</dd>
        <dt className="text-muted-foreground">Gross profit</dt><dd className="num">{money(p.grossProfitExGst)}</dd>
        <dt className="text-muted-foreground">Margin</dt><dd className="num">{percent(p.grossMarginPct)}</dd>
        <dt className="text-muted-foreground">Marketing</dt><dd className="num">{money(p.marketingExGst)}</dd>
        <dt className="text-muted-foreground">Delivery cost and fees</dt><dd className="num">{money(p.deliveryCostExGst + p.paymentFeesExGst)}</dd>
        <dt className="font-semibold">Net profit</dt><dd className="num font-semibold">{money(p.netProfitExGst)}</dd>
      </dl>
    </div>
  )
}

export function SalesChart({ series, interval }: { series: Point[]; interval: 'day' | 'month' }) {
  const [shown, setShown] = useState<Record<Key, boolean>>(() => Object.fromEntries(SERIES.map((s) => [s.key, s.on])) as Record<Key, boolean>)
  const visible = SERIES.filter((s) => shown[s.key])
  const showCounts = shown.orders
  const empty = series.every((p) => p.orders === 0 && p.marketingExGst === 0)
  const tick = (value: string) => calendarDate(value, interval === 'month' ? 'month' : 'day')

  return (
    <div>
      <div className="mb-4 flex flex-wrap gap-2" role="group" aria-label="Series shown on the chart">
        {SERIES.map((s) => (
          <button
            key={s.key}
            type="button"
            aria-pressed={shown[s.key]}
            onClick={() => setShown((prev) => ({ ...prev, [s.key]: !prev[s.key] }))}
            className={cn(
              'inline-flex min-h-9 items-center gap-2 rounded-full border px-3 text-[13px] font-medium transition-colors',
              shown[s.key] ? 'border-foreground/25 bg-card' : 'border-dashed bg-transparent text-muted-foreground',
            )}
          >
            <span
              aria-hidden="true"
              className={cn('inline-block', s.kind === 'bar' ? 'size-3 rounded-sm' : 'h-[3px] w-4 rounded-full')}
              style={{ background: shown[s.key] ? s.color : 'var(--input)' }}
            />
            {s.label}
          </button>
        ))}
      </div>

      <div className="relative h-[280px] w-full sm:h-[360px]">
        {empty && (
          <p className="absolute inset-0 z-10 grid place-items-center text-sm text-muted-foreground">No sales or marketing in this period yet.</p>
        )}
        <ResponsiveContainer width="100%" height="100%">
          <ComposedChart data={series} margin={{ top: 8, right: showCounts ? 4 : 8, bottom: 0, left: 0 }} barGap={2}>
            <CartesianGrid vertical={false} stroke="var(--border)" />
            <XAxis dataKey="period" tickFormatter={tick} tick={{ fontSize: 12, fill: 'var(--muted-foreground)' }} tickLine={false} axisLine={{ stroke: 'var(--border)' }} minTickGap={20} interval="preserveStartEnd" />
            <YAxis yAxisId="money" tickFormatter={(v: number) => moneyShort(v)} tick={{ fontSize: 12, fill: 'var(--muted-foreground)' }} tickLine={false} axisLine={false} width={56} />
            {showCounts && <YAxis yAxisId="count" orientation="right" allowDecimals={false} tick={{ fontSize: 12, fill: 'var(--muted-foreground)' }} tickLine={false} axisLine={false} width={32} />}
            <Tooltip content={(props) => <ChartTooltip active={props.active} payload={props.payload as unknown as { payload: Point }[]} interval={interval} />} cursor={{ fill: 'rgba(14,58,71,.06)' }} />
            {visible.map((s) =>
              s.kind === 'bar' ? (
                <Bar key={s.key} yAxisId="money" dataKey={s.key} name={s.label} fill={s.color} radius={[3, 3, 0, 0]} maxBarSize={36} isAnimationActive={false} />
              ) : (
                <Line key={s.key} yAxisId={s.axis} dataKey={s.key} name={s.label} stroke={s.color} strokeWidth={2.5} dot={series.length <= 31 ? { r: 2.5 } : false} activeDot={{ r: 5 }} type="linear" isAnimationActive={false} />
              ),
            )}
          </ComposedChart>
        </ResponsiveContainer>
      </div>

      <details className="mt-3 text-sm">
        <summary className="inline-flex min-h-9 items-center font-medium text-action-text">Show as a table</summary>
        <div className="table-wrap mt-2 max-h-96 rounded-lg border">
          <table className="data-table">
            <thead>
              <tr><th>{interval === 'month' ? 'Month' : 'Day'}</th><th className="num">Orders</th><th className="num">Sales ex GST</th><th className="num">Cost of parts</th><th className="num">Gross profit</th><th className="num">Margin</th><th className="num">Marketing</th><th className="num">Net profit</th></tr>
            </thead>
            <tbody>
              {series.map((p) => (
                <tr key={p.period}>
                  <td className="whitespace-nowrap">{interval === 'month' ? calendarDate(p.period, 'month') : p.period}</td>
                  <td className="num">{p.orders}</td>
                  <td className="num">{money(p.revenueExGst)}</td>
                  <td className="num">{money(p.costOfGoodsExGst)}</td>
                  <td className="num">{money(p.grossProfitExGst)}</td>
                  <td className="num">{percent(p.grossMarginPct)}</td>
                  <td className="num">{money(p.marketingExGst)}</td>
                  <td className="num">{money(p.netProfitExGst)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </details>
    </div>
  )
}
