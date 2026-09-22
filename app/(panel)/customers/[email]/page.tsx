import type { Metadata } from 'next'
import Link from 'next/link'
import { notFound } from 'next/navigation'
import { ApiError, adminApi } from '@/lib/api'
import { requireOwner } from '@/lib/session'
import type { CustomerDetail } from '@/lib/types'
import { date, dateTime, money } from '@/lib/format'
import { Card, PageHeader, Pill, StatusBadge } from '@/components/page'
import { ErrorPanel } from '@/components/ErrorPanel'

type Props = { params: Promise<{ email: string }> }

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  return { title: decodeURIComponent((await params).email) }
}

export default async function CustomerPage({ params }: Props) {
  await requireOwner()
  const email = decodeURIComponent((await params).email)
  let c: CustomerDetail
  try {
    c = await adminApi<CustomerDetail>(`/customers/${encodeURIComponent(email)}`)
  } catch (e) {
    if (e instanceof ApiError && e.status === 404) notFound()
    return <><PageHeader title="Customer" back={{ href: '/customers', label: 'Customers' }} /><ErrorPanel error={e} /></>
  }
  const a = c.lastAddress

  return (
    <>
      <PageHeader title={c.name} back={{ href: '/customers', label: 'Customers' }} description={c.email} actions={c.account ? <Pill tone="info">Has an account since {date(c.account.createdAt)}</Pill> : <Pill>Guest</Pill>} />
      <div className="grid gap-6 xl:grid-cols-[minmax(0,2fr)_minmax(280px,1fr)]">
        <Card title="Orders" description={`${c.orders} paid, ${money(c.spentIncGst)} in total`} bodyClassName="p-0">
          <div className="table-wrap">
            <table className="data-table">
              <thead><tr><th>Order</th><th>Status</th><th className="num">Items</th><th className="num">Total</th><th>When</th></tr></thead>
              <tbody>
                {c.history.map((o) => (
                  <tr key={o.orderNo}>
                    <td><Link href={`/orders/${o.orderNo}`} className="font-semibold text-action-text hover:underline">{o.orderNo}</Link></td>
                    <td><StatusBadge status={o.status} /></td>
                    <td className="num">{o.items}</td>
                    <td className="num">{money(o.totalIncGst)}</td>
                    <td className="whitespace-nowrap">{dateTime(o.paidAt ?? o.createdAt)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Card>
        <Card title="Contact">
          <p className="text-sm"><a className="text-action-text underline" href={`mailto:${c.email}`}>{c.email}</a></p>
          <p className="text-sm"><a className="text-action-text underline" href={`tel:${c.phone.replace(/\s/g, '')}`}>{c.phone}</a></p>
          <h3 className="mt-4 text-sm font-semibold">Last delivery address</h3>
          <address className="text-sm not-italic leading-relaxed">
            {[a.fullName, a.company, a.street1, a.street2, `${a.suburb} ${a.state} ${a.postcode}`].filter(Boolean).map((line) => <span key={line} className="block">{line}</span>)}
          </address>
        </Card>
      </div>
    </>
  )
}
