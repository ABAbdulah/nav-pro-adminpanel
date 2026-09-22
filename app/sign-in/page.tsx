import type { Metadata } from 'next'
import { redirect } from 'next/navigation'
import { currentOperator } from '@/lib/session'
import { SignInForm } from './SignInForm'

export const metadata: Metadata = { title: 'Sign in' }

export default async function SignInPage({ searchParams }: { searchParams: Promise<{ next?: string }> }) {
  if (await currentOperator()) redirect('/')
  const { next } = await searchParams

  return (
    <main id="main" className="grid min-h-dvh place-items-center bg-brand px-4 py-10">
      <div className="w-full max-w-sm rounded-xl bg-card p-6 shadow-lg sm:p-8">
        <p className="text-sm font-medium text-muted-foreground">Parts Finder</p>
        <h1 className="mb-6 text-3xl font-bold">Admin sign in</h1>
        <SignInForm next={next ?? ''} />
      </div>
    </main>
  )
}
