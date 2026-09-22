import { AlertTriangle } from 'lucide-react'
import { ApiError } from '@/lib/api'

/** Shown in place of a page's content when the API call behind it failed. */
export function ErrorPanel({ error }: { error: unknown }) {
  const message = error instanceof ApiError ? error.message : 'Something went wrong loading this page.'
  return (
    <div role="alert" className="flex gap-3 rounded-xl border border-destructive/40 bg-[#fbe9e8] p-4 text-[#7d201c]">
      <AlertTriangle className="mt-0.5 size-5 shrink-0" aria-hidden="true" />
      <div>
        <p className="font-semibold">This couldn’t load</p>
        <p className="text-sm">{message}</p>
      </div>
    </div>
  )
}
