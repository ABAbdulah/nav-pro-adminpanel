'use client'

import { useEffect } from 'react'
import { AlertTriangle, RotateCw } from 'lucide-react'
import { Button } from '@/components/ui/button'

export default function PanelError({ error, reset }: { error: Error & { digest?: string }; reset: () => void }) {
  useEffect(() => {
    console.error(error)
  }, [error])

  return (
    <div role="alert" className="mx-auto mt-10 max-w-lg rounded-xl border bg-card p-6 text-center">
      <AlertTriangle className="mx-auto mb-3 size-8 text-destructive" aria-hidden="true" />
      <h1 className="text-2xl font-bold">Something went wrong</h1>
      <p className="mt-1 text-sm text-muted-foreground">Nothing you entered has been lost from the store. Try again, and if it keeps happening, check that the store API is running.</p>
      <Button className="mt-5" onClick={reset}><RotateCw aria-hidden="true" /> Try again</Button>
    </div>
  )
}
