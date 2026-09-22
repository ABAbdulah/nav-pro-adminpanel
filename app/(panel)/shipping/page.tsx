import type { Metadata } from 'next'
import { AlertTriangle } from 'lucide-react'
import { adminApi } from '@/lib/api'
import type { Rate, Zone } from '@/lib/types'
import { PageHeader } from '@/components/page'
import { ErrorPanel } from '@/components/ErrorPanel'
import { AddZone, ZoneCard } from '@/components/shipping/ShippingForms'

export const metadata: Metadata = { title: 'Delivery' }

export default async function ShippingPage() {
  let zones: Zone[]
  let rates: Rate[]
  try {
    ;[zones, rates] = await Promise.all([adminApi<Zone[]>('/shipping/zones'), adminApi<Rate[]>('/shipping/rates')])
  } catch (e) {
    return <><PageHeader title="Delivery" /><ErrorPanel error={e} /></>
  }

  const usable = zones.some((z) => z.is_active && rates.some((r) => r.zone_id === z.id && r.is_active))

  return (
    <>
      <PageHeader
        title="Delivery"
        description="Where you deliver and what customers pay. At checkout the customer’s address is matched to an area, and they choose from its options."
        actions={<AddZone />}
      />

      {!usable && (
        <div role="alert" className="mb-6 flex gap-3 rounded-xl border border-destructive/40 bg-[#fbe9e8] p-4 text-[#7d201c]">
          <AlertTriangle className="mt-0.5 size-5 shrink-0" aria-hidden="true" />
          <p className="text-sm"><strong>Customers can’t check out yet.</strong> Add a delivery area that is in use, with at least one delivery option offered at checkout. A single “All of Australia” area with a “Standard” option is enough to start.</p>
        </div>
      )}

      <div className="grid gap-4">
        {zones.map((z) => <ZoneCard key={z.id} zone={z} rates={rates.filter((r) => r.zone_id === z.id)} />)}
      </div>
    </>
  )
}
