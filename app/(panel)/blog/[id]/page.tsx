import type { Metadata } from 'next'
import { notFound } from 'next/navigation'
import { ApiError, adminApi } from '@/lib/api'
import { requireOwner } from '@/lib/session'
import type { BlogPostAdmin } from '@/lib/types'
import { Card, PageHeader } from '@/components/page'
import { ErrorPanel } from '@/components/ErrorPanel'
import { History } from '@/components/History'
import { PostEditor } from '@/components/blog/PostEditor'

type Props = { params: Promise<{ id: string }> }

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  return { title: `Post ${(await params).id}` }
}

export default async function EditPostPage({ params }: Props) {
  await requireOwner()
  const id = Number((await params).id)
  if (!Number.isSafeInteger(id) || id <= 0) notFound()
  let post: BlogPostAdmin
  try {
    post = await adminApi<BlogPostAdmin>(`/blog/${id}`)
  } catch (e) {
    if (e instanceof ApiError && e.status === 404) notFound()
    return <><PageHeader title="Post" back={{ href: '/blog', label: 'Blog' }} /><ErrorPanel error={e} /></>
  }
  return (
    <>
      <PageHeader title={post.status === 'published' ? 'Edit post' : 'Edit draft'} back={{ href: '/blog', label: 'Blog' }} />
      <PostEditor post={post} storefront={process.env.STOREFRONT_URL?.replace(/\/$/, '') ?? null} />
      {post.history && post.history.length > 0 && (
        <Card title="Change history" className="mt-6">
          <History entries={post.history} labels={{ title: 'Title', slug: 'Web address', excerpt: 'Summary', cover_image_url: 'Cover photo', status: 'Status', seo_title: 'Search title', seo_description: 'Search description', related_query: 'Parts for' }} />
        </Card>
      )}
    </>
  )
}
