import type { Metadata } from 'next'
import { adminApi } from '@/lib/api'
import { allowedEmails, requireOwner } from '@/lib/session'
import type { TeamMember } from '@/lib/types'
import { Card, PageHeader } from '@/components/page'
import { ErrorPanel } from '@/components/ErrorPanel'
import { AddMember, MemberRow } from '@/components/team/TeamForms'

export const metadata: Metadata = { title: 'Team' }

export default async function TeamPage() {
  const me = await requireOwner()
  let members: TeamMember[]
  try {
    members = await adminApi<TeamMember[]>('/operators')
  } catch (e) {
    return <><PageHeader title="Team" /><ErrorPanel error={e} /></>
  }
  const passwordOwners = allowedEmails()

  return (
    <>
      <PageHeader title="Team" description="Who can sign in to this panel. Each person signs in with a code emailed to them, so nobody shares a password." />
      <div className="grid gap-6 xl:grid-cols-[minmax(0,3fr)_minmax(0,2fr)]">
        <Card title="People" description={members.length === 0 ? 'No team accounts yet.' : `${members.filter((m) => m.isActive).length} can sign in`} bodyClassName="py-1">
          {members.length === 0 ? (
            <p className="py-4 text-sm text-muted-foreground">Add the people who pack and ship orders, and anyone else who helps run the store.</p>
          ) : (
            <ul>{members.map((m) => <MemberRow key={m.id} member={m} isYou={m.email === me.email} />)}</ul>
          )}
        </Card>
        <div className="grid content-start gap-6">
          <Card title="Add a person"><AddMember /></Card>
          <Card title="Owner password">
            <p className="text-sm">These emails can also sign in with the shared owner password, even if email is down. They are set in the panel’s <code className="rounded bg-muted px-1">ADMIN_EMAILS</code> setting on Vercel.</p>
            <ul className="mt-2 list-disc pl-5 text-sm">{passwordOwners.map((e) => <li key={e}>{e}</li>)}</ul>
          </Card>
        </div>
      </div>
    </>
  )
}
