'use client'

import { useEffect } from 'react'
import { useRouter } from 'next/navigation'

/**
 * Re-reads the page's data every so often while the tab is visible, so orders
 * placed on the storefront appear without anyone pressing reload. It refreshes
 * server data only; form fields being typed into keep their values.
 */
export function AutoRefresh({ seconds = 60 }: { seconds?: number }) {
  const router = useRouter()
  useEffect(() => {
    const tick = () => {
      if (document.visibilityState === 'visible') router.refresh()
    }
    const timer = setInterval(tick, seconds * 1000)
    document.addEventListener('visibilitychange', tick)
    return () => {
      clearInterval(timer)
      document.removeEventListener('visibilitychange', tick)
    }
  }, [router, seconds])
  return null
}
