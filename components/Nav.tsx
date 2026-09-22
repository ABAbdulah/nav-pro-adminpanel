'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { useEffect, useState } from 'react'
import { BarChart3, History, LogOut, Megaphone, Menu, Package, PieChart, Settings, ShoppingBag, Tags, Truck, Users, UsersRound, X } from 'lucide-react'
import { signOut } from '@/app/sign-in/actions'
import { cn } from '@/lib/utils'

type Role = 'owner' | 'staff'

// Staff pack and ship: they see Orders only.
const LINKS: { href: string; label: string; icon: typeof BarChart3; badge?: boolean; staff?: boolean; divider?: boolean }[] = [
  { href: '/', label: 'Dashboard', icon: BarChart3 },
  { href: '/orders', label: 'Orders', icon: ShoppingBag, badge: true, staff: true },
  { href: '/products', label: 'Products', icon: Package },
  { href: '/customers', label: 'Customers', icon: Users },
  { href: '/reports', label: 'Reports', icon: PieChart },
  { href: '/marketing', label: 'Marketing', icon: Megaphone },
  { href: '/pricing', label: 'Pricing rules', icon: Tags, divider: true },
  { href: '/shipping', label: 'Delivery', icon: Truck },
  { href: '/team', label: 'Team', icon: UsersRound },
  { href: '/history', label: 'Change history', icon: History },
  { href: '/settings', label: 'Settings', icon: Settings },
]

function isActive(pathname: string, href: string) {
  return href === '/' ? pathname === '/' : pathname === href || pathname.startsWith(`${href}/`)
}

function Links({ pathname, toPack, role, onNavigate }: { pathname: string; toPack: number | null; role: Role; onNavigate?: () => void }) {
  return (
    <ul className="grid gap-1">
      {LINKS.filter((l) => role === 'owner' || l.staff).map(({ href, label, icon: Icon, badge, divider }) => {
        const active = isActive(pathname, href)
        return (
          <li key={href} className={cn(divider && role === 'owner' && 'mt-3 border-t border-white/15 pt-3')}>
            <Link
              href={href}
              onClick={onNavigate}
              aria-current={active ? 'page' : undefined}
              className={cn(
                'flex min-h-11 items-center gap-3 rounded-lg px-3 text-[15px] font-medium text-brand-ink/85 transition-colors hover:bg-white/10 hover:text-brand-ink',
                active && 'bg-white/15 text-brand-ink',
              )}
            >
              <Icon className="size-[18px]" aria-hidden="true" />
              <span className="flex-1">{label}</span>
              {badge && toPack ? (
                <span className="rounded-full bg-primary px-2 py-0.5 text-xs font-bold text-primary-foreground" aria-label={`${toPack} to pack`}>
                  {toPack}
                </span>
              ) : null}
            </Link>
          </li>
        )
      })}
    </ul>
  )
}

function Account({ email, role }: { email: string; role: Role }) {
  return (
    <div className="border-t border-white/15 pt-4">
      <p className="truncate px-3 text-xs text-brand-dim" title={email}>Signed in as {email}</p>
      <p className="px-3 text-xs text-brand-dim">{role === 'owner' ? 'Owner' : 'Staff: orders only'}</p>
      <form action={signOut}>
        <button type="submit" className="mt-2 flex min-h-11 w-full items-center gap-3 rounded-lg px-3 text-sm text-brand-ink/85 hover:bg-white/10 hover:text-brand-ink">
          <LogOut className="size-[18px]" aria-hidden="true" /> Sign out
        </button>
      </form>
    </div>
  )
}

export function Nav({ email, role, toPack }: { email: string; role: Role; toPack: number | null }) {
  const pathname = usePathname()
  const [open, setOpen] = useState(false)

  useEffect(() => {
    if (!open) return
    const close = (e: KeyboardEvent) => e.key === 'Escape' && setOpen(false)
    document.addEventListener('keydown', close)
    document.body.style.overflow = 'hidden'
    return () => {
      document.removeEventListener('keydown', close)
      document.body.style.overflow = ''
    }
  }, [open])

  return (
    <>
      {/* Phones and tablets: a bar with a menu button. */}
      <header className="sticky top-0 z-30 flex h-14 items-center justify-between bg-brand px-4 text-brand-ink lg:hidden">
        <Link href={role === 'owner' ? '/' : '/orders'} className="font-heading text-xl font-bold">Parts Finder admin</Link>
        <button
          type="button"
          onClick={() => setOpen(true)}
          aria-expanded={open}
          aria-controls="mobile-nav"
          className="relative grid size-11 place-items-center rounded-lg hover:bg-white/10"
        >
          <Menu aria-hidden="true" />
          <span className="sr-only">Menu</span>
          {toPack ? <span className="absolute right-1.5 top-1.5 size-2.5 rounded-full bg-primary" aria-hidden="true" /> : null}
        </button>
      </header>
      {open && (
        <div className="fixed inset-0 z-40 lg:hidden" role="dialog" aria-modal="true" aria-label="Menu" id="mobile-nav">
          <button type="button" className="absolute inset-0 bg-black/40" aria-label="Close menu" onClick={() => setOpen(false)} />
          <nav className="absolute inset-y-0 left-0 flex w-72 max-w-[85vw] flex-col gap-6 bg-brand p-4 text-brand-ink animate-in slide-in-from-left">
            <div className="flex items-center justify-between">
              <span className="font-heading text-xl font-bold">Menu</span>
              <button type="button" onClick={() => setOpen(false)} className="grid size-11 place-items-center rounded-lg hover:bg-white/10">
                <X aria-hidden="true" /><span className="sr-only">Close menu</span>
              </button>
            </div>
            <div className="flex-1"><Links pathname={pathname} toPack={toPack} role={role} onNavigate={() => setOpen(false)} /></div>
            <Account email={email} role={role} />
          </nav>
        </div>
      )}

      {/* Desktop: a fixed sidebar. */}
      {/* The column carries the colour the full height; the menu inside stays in view. */}
      <div className="hidden bg-brand lg:block">
      <nav aria-label="Main" className="sticky top-0 flex h-dvh flex-col gap-6 overflow-y-auto px-3 py-6 text-brand-ink">
        <Link href="/" className="px-3 font-heading text-2xl font-bold leading-none">
          Parts Finder
          <span className="mt-1 block font-sans text-xs font-medium tracking-wide text-brand-dim">Admin</span>
        </Link>
        <div className="flex-1"><Links pathname={pathname} toPack={toPack} role={role} /></div>
        <Account email={email} role={role} />
      </nav>
      </div>
    </>
  )
}
