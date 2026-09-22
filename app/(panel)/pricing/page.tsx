import type { Metadata } from 'next'
import Link from 'next/link'
import { Info } from 'lucide-react'
import { adminApi } from '@/lib/api'
import { requireOwner } from '@/lib/session'
import type { BrandCode, PriceRule } from '@/lib/types'
import { Card, PageHeader } from '@/components/page'
import { ErrorPanel } from '@/components/ErrorPanel'
import { AddRule, RuleRow } from '@/components/pricing/RuleForms'

export const metadata: Metadata = { title: 'Pricing rules' }

export default async function PricingPage() {
  await requireOwner()
  let rules: PriceRule[]
  let brands: BrandCode[]
  try {
    ;[rules, brands] = await Promise.all([adminApi<PriceRule[]>('/price-rules'), adminApi<BrandCode[]>('/brand-codes')])
  } catch (e) {
    return <><PageHeader title="Pricing rules" /><ErrorPanel error={e} /></>
  }

  return (
    <>
      <PageHeader title="Pricing rules" description="How the store prices parts that have no supplier RRP." />

      <div className="mb-6 flex gap-3 rounded-xl border bg-card p-4 text-sm">
        <Info className="mt-0.5 size-5 shrink-0 text-action-text" aria-hidden="true" />
        <div className="grid gap-1">
          <p>Most parts sell at the supplier’s RRP. A part <strong>without</strong> an RRP sells at its cost plus a markup, plus GST. With no rule, the markup is 40%.</p>
          <p>A rule sets the markup for one supplier brand, or for every brand. If more than one rule matches, the highest priority wins. To change one product’s price, edit it on the <Link href="/products" className="underline">Products</Link> page instead.</p>
        </div>
      </div>

      <div className="grid gap-6 xl:grid-cols-[minmax(0,3fr)_minmax(0,2fr)]">
        <Card title="Rules" description={rules.length === 0 ? 'None yet: every part without an RRP uses the 40% default.' : 'Highest priority first.'} bodyClassName="py-1">
          {rules.length === 0 ? <p className="py-4 text-sm text-muted-foreground">No rules.</p> : <ul>{rules.map((r) => <RuleRow key={r.id} rule={r} brands={brands} />)}</ul>}
        </Card>
        <Card title="Add a rule" className="self-start">
          <AddRule brands={brands} />
        </Card>
      </div>
    </>
  )
}
