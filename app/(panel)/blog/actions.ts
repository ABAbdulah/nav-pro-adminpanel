'use server'

import { revalidatePath } from 'next/cache'
import { redirect } from 'next/navigation'
import { ApiError, adminApi } from '@/lib/api'
import { requireOwner } from '@/lib/session'
import type { ActionState, BlogPostAdmin } from '@/lib/types'

const text = (form: FormData, name: string) => String(form.get(name) ?? '').trim()

/** Start a post from its title and open the editor. */
export async function createPost(_prev: ActionState, form: FormData): Promise<ActionState> {
  await requireOwner()
  const title = text(form, 'title')
  if (!title) return { error: 'Give the post a title first.' }
  let id: number
  try {
    id = (await adminApi<BlogPostAdmin>('/blog', { method: 'POST', body: { title } })).id
  } catch (e) {
    if (e instanceof ApiError) return { error: e.message }
    throw e
  }
  revalidatePath('/blog')
  redirect(`/blog/${id}`)
}

/**
 * Save the editor. The button pressed says what happens to the status:
 * "save" keeps it, "publish" and "unpublish" change it.
 */
export async function savePost(id: number, _prev: ActionState, form: FormData): Promise<ActionState> {
  await requireOwner()
  const intent = text(form, 'intent')
  const body: Record<string, unknown> = {
    title: text(form, 'title'),
    slug: text(form, 'slug').toLowerCase() || undefined,
    excerpt: text(form, 'excerpt'),
    bodyMd: String(form.get('bodyMd') ?? ''),
    coverAlt: text(form, 'coverAlt'),
    coverImageUrl: text(form, 'coverImageUrl'),
    authorName: text(form, 'authorName'),
    seoTitle: text(form, 'seoTitle'),
    seoDescription: text(form, 'seoDescription'),
    relatedQuery: text(form, 'relatedQuery'),
  }
  if (!body.title) return { error: 'The post needs a title.', fieldErrors: { title: ['Enter a title.'] } }
  if (intent === 'publish') {
    if (!String(body.bodyMd).trim()) return { error: 'Write the article before publishing it.' }
    body.status = 'published'
  }
  if (intent === 'unpublish') body.status = 'draft'
  const since = text(form, 'ifUnchangedSince')
  if (since) body.ifUnchangedSince = since

  let saved: BlogPostAdmin
  try {
    saved = await adminApi<BlogPostAdmin>(`/blog/${id}`, { method: 'PATCH', body })
  } catch (e) {
    if (e instanceof ApiError) {
      const details = e.details as { fieldErrors?: Record<string, string[]> } | undefined
      return { source: e.status === 409 ? 'conflict' : undefined, error: e.status === 400 ? 'Some details aren’t valid. Check the highlighted fields.' : e.message, fieldErrors: details?.fieldErrors }
    }
    throw e
  }
  revalidatePath('/blog')
  revalidatePath(`/blog/${id}`)
  return {
    ok: true,
    message:
      intent === 'publish' ? 'Published. It is on the store now.'
      : intent === 'unpublish' ? 'Unpublished. It is off the store and saved as a draft.'
      : saved.status === 'published' ? 'Saved. The store shows the change now.'
      : 'Draft saved.',
  }
}

export async function deletePost(id: number, _prev: ActionState, _form: FormData): Promise<ActionState> {
  await requireOwner()
  try {
    await adminApi(`/blog/${id}`, { method: 'DELETE' })
  } catch (e) {
    if (e instanceof ApiError) return { error: e.message }
    throw e
  }
  revalidatePath('/blog')
  redirect('/blog')
}

/** Upload a cover photo (already shrunk in the browser). */
export async function uploadCover(id: number, form: FormData): Promise<ActionState & { imageUrl?: string; updatedAt?: string }> {
  await requireOwner()
  const file = form.get('photo')
  if (!(file instanceof File) || file.size === 0) return { error: 'Choose a photo first.' }
  try {
    const result = await adminApi<{ imageUrl: string; post: BlogPostAdmin }>(`/blog/${id}/cover`, {
      method: 'POST',
      raw: { data: await file.arrayBuffer(), contentType: file.type || 'image/jpeg' },
    })
    revalidatePath(`/blog/${id}`)
    return { ok: true, message: 'Cover photo uploaded.', imageUrl: result.imageUrl, updatedAt: result.post.updatedAt }
  } catch (e) {
    if (e instanceof ApiError) return { error: e.message }
    throw e
  }
}
