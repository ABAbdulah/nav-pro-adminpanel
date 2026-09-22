import { requireOperator } from '@/lib/session'
import { adminApi } from '@/lib/api'
import type { OrderSummary, Page } from '@/lib/types'
import { Nav } from '@/components/Nav'

export default async function PanelLayout({ children }: { children: React.ReactNode }) {
  const operator = await requireOperator()
  // The badge is a convenience: a slow or failed API must not take the page down with it.
  const toSend = await adminApi<Page<OrderSummary>>('/orders', { query: { status: 'open', limit: 1 } }).then((p) => p.total, () => null)

  return (
    <div className="min-h-dvh lg:grid lg:grid-cols-[232px_minmax(0,1fr)]">
      <a href="#main" className="skip-link">Skip to content</a>
      <Nav email={operator.email} role={operator.role} toPack={toSend} />
      <main id="main" tabIndex={-1} className="min-w-0 px-4 pb-16 pt-5 sm:px-6 lg:px-8 lg:pt-8">
        <div className="mx-auto max-w-[1400px]">{children}</div>
      </main>
    </div>
  )
}
