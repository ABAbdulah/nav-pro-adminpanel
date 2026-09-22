'use client'

import { useActionState, useState } from 'react'
import { LoaderCircle } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { requestCode, signIn, verifyCode, type SignInState } from './actions'

function Pending({ pending, children }: { pending: boolean; children: React.ReactNode }) {
  return (
    <Button type="submit" size="lg" disabled={pending}>
      {pending && <LoaderCircle className="animate-spin" aria-hidden="true" />}
      {children}
    </Button>
  )
}

function CodeSignIn({ next }: { next: string }) {
  const [asked, ask, asking] = useActionState<SignInState, FormData>(requestCode, {})
  const [checked, check, checking] = useActionState<SignInState, FormData>(verifyCode, {})
  const onCodeStep = asked.step === 'code' || checked.step === 'code'
  const email = checked.email ?? asked.email ?? ''

  if (!onCodeStep) {
    return (
      <form action={ask} className="grid gap-4" noValidate>
        <div>
          <label htmlFor="code-email" className="field-label">Email</label>
          <Input id="code-email" name="email" type="email" autoComplete="username" required defaultValue={asked.email} autoFocus />
        </div>
        {asked.error && <p role="alert" className="field-error">{asked.error}</p>}
        <Pending pending={asking}>Email me a sign-in code</Pending>
      </form>
    )
  }

  return (
    <form action={check} className="grid gap-4" noValidate>
      <input type="hidden" name="email" value={email} />
      <input type="hidden" name="next" value={next} />
      {asked.message && <p role="status" className="text-sm text-muted-foreground">{asked.message}</p>}
      <div>
        <label htmlFor="code" className="field-label">6-digit code</label>
        <Input id="code" name="code" inputMode="numeric" autoComplete="one-time-code" maxLength={7} required autoFocus className="text-center text-2xl tracking-[.3em]" />
      </div>
      {checked.error && <p role="alert" className="field-error">{checked.error}</p>}
      <Pending pending={checking}>Sign in</Pending>
      <button type="submit" formAction={ask} formNoValidate className="min-h-10 justify-self-start text-sm font-medium text-action-text underline" disabled={asking}>
        Send a new code
      </button>
    </form>
  )
}

function PasswordSignIn({ next }: { next: string }) {
  const [state, action, pending] = useActionState<SignInState, FormData>(signIn, {})
  return (
    <form action={action} className="grid gap-4" noValidate>
      <input type="hidden" name="next" value={next} />
      <div>
        <label htmlFor="email" className="field-label">Email</label>
        <Input id="email" name="email" type="email" autoComplete="username" required defaultValue={state.email} autoFocus />
      </div>
      <div>
        <label htmlFor="password" className="field-label">Owner password</label>
        <Input id="password" name="password" type="password" autoComplete="current-password" required />
      </div>
      {state.error && <p role="alert" className="field-error">{state.error}</p>}
      <Pending pending={pending}>Sign in</Pending>
    </form>
  )
}

export function SignInForm({ next }: { next: string }) {
  const [mode, setMode] = useState<'code' | 'password'>('code')
  return (
    <div className="grid gap-5">
      {mode === 'code' ? <CodeSignIn next={next} /> : <PasswordSignIn next={next} />}
      <button
        type="button"
        onClick={() => setMode(mode === 'code' ? 'password' : 'code')}
        className="min-h-10 border-t pt-4 text-left text-sm font-medium text-action-text underline"
      >
        {mode === 'code' ? 'Sign in with the owner password instead' : 'Sign in with an emailed code instead'}
      </button>
    </div>
  )
}
