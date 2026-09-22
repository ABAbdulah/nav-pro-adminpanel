import type { Metadata } from 'next'
import { adminApi } from '@/lib/api'
import { requireOwner } from '@/lib/session'
import type { Settings } from '@/lib/types'
import { dateTime } from '@/lib/format'
import { Card, PageHeader } from '@/components/page'
import { ErrorPanel } from '@/components/ErrorPanel'
import { AlertsForm, FeesForm } from '@/components/settings/SettingsForms'

export const metadata: Metadata = { title: 'Settings' }

function changed(s: { updatedBy: string | null; updatedAt: string | null }) {
  return s.updatedAt ? `Last changed ${dateTime(s.updatedAt)}${s.updatedBy ? ` by ${s.updatedBy}` : ''}` : 'Using the defaults'
}

export default async function SettingsPage() {
  await requireOwner()
  let settings: Settings
  try {
    settings = await adminApi<Settings>('/settings')
  } catch (e) {
    return <><PageHeader title="Settings" /><ErrorPanel error={e} /></>
  }
  return (
    <>
      <PageHeader title="Settings" />
      <div className="grid gap-6 xl:grid-cols-2">
        <Card title="Card and PayPal fees" description={changed(settings.payment_fees)}><FeesForm settings={settings.payment_fees} /></Card>
        <Card title="New order emails" description={changed(settings.order_alert_emails)}><AlertsForm settings={settings.order_alert_emails} /></Card>
      </div>
    </>
  )
}
