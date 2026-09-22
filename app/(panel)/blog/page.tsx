import type { Metadata } from 'next'
import Link from 'next/link'
import { adminApi } from '@/lib/api'
import { requireOwner } from '@/lib/session'
import type { BlogPostAdmin } from '@/lib/types'
import { date } from '@/lib/format'
import { Card, EmptyState, PageHeader, Pill } from '@/components/page'
import { ErrorPanel } from '@/components/ErrorPanel'
import { NewPost } from '@/components/blog/NewPost'

export const metadata: Metadata = { title: 'Blog' }

export default async function BlogListPage() {
  await requireOwner()
  let posts: BlogPostAdmin[]
  try {
    posts = await adminApi<BlogPostAdmin[]>('/blog')
  } catch (e) {
    return <><PageHeader title="Blog" /><ErrorPanel error={e} /></>
  }
  const storefront = process.env.STOREFRONT_URL?.replace(/\/$/, '')

  return (
    <>
      <PageHeader title="Blog" description="Guides and articles on the store at /blog. Helpful articles bring visitors from Google and build trust. Drafts are never shown on the store." />
      <Card title="Start a new post" className="mb-6"><NewPost /></Card>
      {posts.length === 0 ? <EmptyState title="No posts yet">Write your first guide above.</EmptyState> : (
        <ul className="grid gap-2">
          {posts.map((p) => (
            <li key={p.id} className="flex flex-wrap items-center justify-between gap-3 rounded-xl border bg-card p-4">
              <div className="min-w-0 flex-1">
                <Link href={`/blog/${p.id}`} className="text-lg font-semibold text-action-text hover:underline">{p.title}</Link>
                <p className="text-[13px] text-muted-foreground">
                  {p.status === 'published' ? `Published ${date(p.publishedAt)}` : `Draft, last saved ${date(p.updatedAt)}`}
                  {' · '}{(p.words ?? 0).toLocaleString('en-AU')} words{p.updatedBy ? ` · ${p.updatedBy}` : ''}
                </p>
              </div>
              <div className="flex items-center gap-2">
                {p.status === 'published' ? <Pill tone="good">On the store</Pill> : <Pill>Draft</Pill>}
                {p.status === 'published' && storefront && <a href={`${storefront}/blog/${p.slug}`} target="_blank" rel="noreferrer" className="text-sm underline">View</a>}
              </div>
            </li>
          ))}
        </ul>
      )}
    </>
  )
}
