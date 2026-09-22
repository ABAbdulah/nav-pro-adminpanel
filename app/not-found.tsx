import Link from 'next/link'

export default function NotFound() {
  return (
    <main id="main" className="mx-auto mt-20 max-w-md px-4 text-center">
      <h1 className="text-3xl font-bold">Not found</h1>
      <p className="mt-2 text-muted-foreground">That order or product doesn’t exist, or the link is out of date.</p>
      <Link href="/" className="mt-6 inline-flex min-h-11 items-center rounded-lg bg-primary px-5 font-medium text-primary-foreground">Back to the dashboard</Link>
    </main>
  )
}
