'use client'

import { useActionState, useEffect, useRef } from 'react'
import { addMember, updateMember } from '@/app/(panel)/team/actions'
import type { ActionState, TeamMember } from '@/lib/types'
import { dateTime } from '@/lib/format'
import { FieldError, FormMessage, SubmitButton } from '@/components/forms'
import { Input } from '@/components/ui/input'
import { Pill } from '@/components/page'

export function AddMember() {
  const [state, action] = useActionState<ActionState, FormData>(addMember, {})
  const form = useRef<HTMLFormElement>(null)
  useEffect(() => {
    if (state.ok) form.current?.reset()
  }, [state])
  return (
    <form ref={form} action={action} className="grid gap-3">
      <div>
        <label htmlFor="member-email" className="field-label">Email</label>
        <Input id="member-email" name="email" type="email" required placeholder="name@example.com" />
        <FieldError state={state} name="email" />
      </div>
      <div>
        <label htmlFor="member-name" className="field-label">Name <span className="font-normal text-muted-foreground">(optional)</span></label>
        <Input id="member-name" name="name" maxLength={100} />
      </div>
      <fieldset className="grid gap-2">
        <legend className="field-label">What they can do</legend>
        <label className="flex items-start gap-2 text-sm"><input type="radio" name="role" value="staff" defaultChecked className="mt-1 size-4" /><span><strong>Staff</strong>: see orders, pack and ship them. They never see costs or profit.</span></label>
        <label className="flex items-start gap-2 text-sm"><input type="radio" name="role" value="owner" className="mt-1 size-4" /><span><strong>Owner</strong>: everything, including costs, profit, prices and the team.</span></label>
      </fieldset>
      <div className="flex flex-wrap items-center gap-3">
        <SubmitButton pendingLabel="Adding…">Add person</SubmitButton>
      </div>
      <FormMessage state={state} />
    </form>
  )
}

export function MemberRow({ member, isYou }: { member: TeamMember; isYou: boolean }) {
  const [state, action] = useActionState<ActionState, FormData>(updateMember.bind(null, member.id), {})
  return (
    <li className="grid gap-2 border-b py-3 last:border-b-0">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div className="min-w-0">
          <p className="font-semibold">{member.name || member.email} {isYou && <span className="text-xs font-normal text-muted-foreground">(you)</span>}</p>
          {member.name && <p className="truncate text-xs text-muted-foreground">{member.email}</p>}
          <p className="text-xs text-muted-foreground">{member.lastLoginAt ? `Last signed in ${dateTime(member.lastLoginAt)}` : 'Has not signed in yet'}</p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          {member.isActive ? <Pill tone="good">Can sign in</Pill> : <Pill tone="bad">Switched off</Pill>}
          <Pill tone={member.role === 'owner' ? 'info' : 'muted'}>{member.role === 'owner' ? 'Owner' : 'Staff'}</Pill>
        </div>
      </div>
      <form action={action} className="flex flex-wrap items-center gap-2">
        <label className="sr-only" htmlFor={`role-${member.id}`}>Role</label>
        <select id={`role-${member.id}`} name="role" defaultValue={member.role} className="h-9 rounded-lg border border-input bg-card px-2 text-sm">
          <option value="staff">Staff</option>
          <option value="owner">Owner</option>
        </select>
        <label className="sr-only" htmlFor={`active-${member.id}`}>Can sign in</label>
        <select id={`active-${member.id}`} name="active" defaultValue={member.isActive ? 'yes' : 'no'} className="h-9 rounded-lg border border-input bg-card px-2 text-sm">
          <option value="yes">Can sign in</option>
          <option value="no">Switched off</option>
        </select>
        <SubmitButton variant="outline" size="sm" pendingLabel="Saving…">Save</SubmitButton>
      </form>
      <FormMessage state={state} />
    </li>
  )
}
