'use client'

import { useActionState, useEffect, useMemo, useRef, useState } from 'react'
import { ExternalLink, ImageOff, LoaderCircle, Upload } from 'lucide-react'
import { deletePost, savePost, uploadCover } from '@/app/(panel)/blog/actions'
import type { ActionState, BlogPostAdmin } from '@/lib/types'
import { renderMarkdown, wordCount } from '@/lib/markdown'
import { shrink } from '@/lib/shrink-image'
import { FieldError, FormMessage, SubmitButton } from '@/components/forms'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { cn } from '@/lib/utils'

function Counter({ value, ideal, max }: { value: string; ideal: [number, number]; max: number }) {
  const n = value.length
  const tone = n === 0 ? 'text-muted-foreground' : n > max ? 'text-destructive font-semibold' : n >= ideal[0] && n <= ideal[1] ? 'text-success' : 'text-warning'
  return <span className={cn('text-xs', tone)}>{n}/{max} characters{n > 0 && n >= ideal[0] && n <= ideal[1] ? ' · good length' : ''}</span>
}

const slugify = (text: string) => text.normalize('NFKD').replace(/[̀-ͯ]/g, '').toLowerCase().replace(/&/g, ' and ').replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '').slice(0, 80)

function CoverUpload({ postId, current, onUploaded }: { postId: number; current: string; onUploaded: (url: string, updatedAt?: string) => void }) {
  const input = useRef<HTMLInputElement>(null)
  const [busy, setBusy] = useState(false)
  const [result, setResult] = useState<ActionState>({})
  async function send(file: File | undefined) {
    if (!file) return
    if (!file.type.startsWith('image/')) return setResult({ error: 'That file isn’t a photo.' })
    setBusy(true)
    setResult({})
    try {
      const form = new FormData()
      form.set('photo', new File([await shrink(file)], 'cover.jpg', { type: 'image/jpeg' }))
      const out = await uploadCover(postId, form)
      setResult(out)
      if (out.ok && out.imageUrl) onUploaded(out.imageUrl, out.updatedAt)
    } catch {
      setResult({ error: 'That photo couldn’t be opened here. Try saving it as a JPEG first.' })
    } finally {
      setBusy(false)
      if (input.current) input.current.value = ''
    }
  }
  return (
    <div className="grid gap-2">
      <div className="grid aspect-video w-full max-w-md place-items-center overflow-hidden rounded-lg border bg-muted">
        {current ? <img src={current} alt="" className="size-full object-cover" /> : <span className="grid place-items-center gap-1 text-xs text-muted-foreground"><ImageOff className="size-5" aria-hidden="true" />No cover photo</span>}
      </div>
      <div className="flex flex-wrap items-center gap-2">
        <button type="button" onClick={() => input.current?.click()} disabled={busy} className="pf-button inline-flex items-center rounded-lg border border-input bg-card text-sm font-medium hover:bg-secondary">
          {busy ? <LoaderCircle className="size-4 animate-spin" aria-hidden="true" /> : <Upload className="size-4" aria-hidden="true" />} {current ? 'Replace cover photo' : 'Upload a cover photo'}
        </button>
        <span className="text-xs text-muted-foreground">A wide photo works best. It also shows when the post is shared.</span>
      </div>
      <input ref={input} type="file" accept="image/*" className="sr-only" tabIndex={-1} aria-label="Cover photo file" onChange={(e) => void send(e.target.files?.[0])} />
      <FormMessage state={result} />
    </div>
  )
}

export function PostEditor({ post, storefront }: { post: BlogPostAdmin; storefront: string | null }) {
  const [state, action] = useActionState<ActionState, FormData>(savePost.bind(null, post.id), {})
  const [delState, delAction] = useActionState<ActionState, FormData>(deletePost.bind(null, post.id), {})
  const [title, setTitle] = useState(post.title)
  const [slug, setSlug] = useState(post.slug)
  const [body, setBody] = useState(post.bodyMd)
  const [excerpt, setExcerpt] = useState(post.excerpt ?? '')
  const [seoTitle, setSeoTitle] = useState(post.seoTitle ?? '')
  const [seoDescription, setSeoDescription] = useState(post.seoDescription ?? '')
  const [cover, setCover] = useState(post.coverImageUrl ?? '')
  const [tab, setTab] = useState<'write' | 'preview'>('write')
  const [confirmDelete, setConfirmDelete] = useState(false)
  // The post's version when this editor loaded it; an upload moves it on.
  const [version, setVersion] = useState(post.updatedAt)
  useEffect(() => setVersion(post.updatedAt), [post.updatedAt])
  const preview = useMemo(() => (tab === 'preview' ? renderMarkdown(body) : ''), [tab, body])
  const published = post.status === 'published'
  const words = wordCount(body)
  const snippetTitle = seoTitle || title
  const snippetText = seoDescription || excerpt || 'Add a search description so Google shows a helpful summary.'
  const liveUrl = storefront ? `${storefront}/blog/${post.slug}` : null

  return (
    <form
      action={action}
      className="grid gap-6 xl:grid-cols-[minmax(0,1fr)_340px]"
      // Enter in a one-line field would press the first button, which publishes a
      // draft. Saving and publishing only ever happen from the buttons.
      onKeyDown={(event) => {
        if (event.key === 'Enter' && event.target instanceof HTMLInputElement) event.preventDefault()
      }}
    >
      <input type="hidden" name="ifUnchangedSince" value={version} />
      <input type="hidden" name="coverImageUrl" value={cover} />
      <input type="hidden" name="bodyMd" value={body} />

      <div className="grid min-w-0 content-start gap-5">
        <div>
          <label htmlFor="post-title" className="field-label">Title</label>
          <Input id="post-title" name="title" value={title} onChange={(e) => setTitle(e.target.value)} maxLength={200} className="text-lg font-semibold" />
          <FieldError state={state} name="title" />
        </div>
        <div>
          <label htmlFor="post-excerpt" className="field-label">Summary <span className="font-normal text-muted-foreground">(shown under the title and on the guides page)</span></label>
          <Textarea id="post-excerpt" name="excerpt" value={excerpt} onChange={(e) => setExcerpt(e.target.value)} rows={2} maxLength={400} />
        </div>

        <div className="grid gap-2">
          <div className="flex flex-wrap items-end justify-between gap-2">
            <span className="field-label mb-0">Article</span>
            <div className="flex gap-1" role="tablist" aria-label="Article view">
              {(['write', 'preview'] as const).map((t) => (
                <button key={t} type="button" role="tab" aria-selected={tab === t} onClick={() => setTab(t)}
                  className={cn('min-h-9 rounded-lg px-3 text-sm font-medium', tab === t ? 'bg-brand text-brand-ink' : 'border bg-card hover:bg-secondary')}>
                  {t === 'write' ? 'Write' : 'Preview'}
                </button>
              ))}
            </div>
          </div>
          {tab === 'write' ? (
            <Textarea aria-label="Article text" value={body} onChange={(e) => setBody(e.target.value)} rows={24} className="font-mono text-[14px] leading-relaxed" />
          ) : (
            <div className="article-preview min-h-64 rounded-lg border bg-card p-5" dangerouslySetInnerHTML={{ __html: preview || '<p>Nothing written yet.</p>' }} />
          )}
          <p className="field-help">{words.toLocaleString('en-AU')} words. Guides that fully answer a question, usually 600 words or more, tend to rank better. <span className="whitespace-nowrap">Formatting:</span> <code>## Heading</code>, <code>**bold**</code>, <code>- list item</code>, <code>[link text](https://…)</code>.</p>
        </div>

        <div>
          <span className="field-label">Cover photo</span>
          <CoverUpload postId={post.id} current={cover} onUploaded={(url, at) => { setCover(url); if (at) setVersion(at) }} />
          <label htmlFor="post-cover-alt" className="field-label mt-3">Describe the photo <span className="font-normal text-muted-foreground">(for screen readers and Google Images)</span></label>
          <Input id="post-cover-alt" name="coverAlt" defaultValue={post.coverAlt ?? ''} maxLength={200} placeholder="e.g. A mechanic checking brake pads on a ute" />
        </div>
      </div>

      <aside className="grid content-start gap-5">
        <div className="grid gap-3 rounded-xl border bg-card p-4">
          <p className="text-sm">{published ? <><strong className="text-success">On the store</strong> since {post.publishedAt ? new Date(post.publishedAt).toLocaleDateString('en-AU') : ''}.</> : <><strong>Draft.</strong> Only the team can see it.</>}</p>
          {published && liveUrl && <a href={liveUrl} target="_blank" rel="noreferrer" className="inline-flex items-center gap-1 text-sm font-medium text-action-text underline">View on the store <ExternalLink className="size-3.5" aria-hidden="true" /></a>}
          <FormMessage state={state} />
          {state.source === 'conflict' && <a href={`/blog/${post.id}`} className="text-sm font-semibold text-action-text underline">Reload this post</a>}
          <div className="grid gap-2">
            {published ? (
              <>
                <SubmitButton name="intent" value="save" pendingLabel="Saving…">Save changes</SubmitButton>
                <SubmitButton name="intent" value="unpublish" variant="outline" pendingLabel="Saving…">Unpublish</SubmitButton>
              </>
            ) : (
              <>
                <SubmitButton name="intent" value="publish" pendingLabel="Publishing…">Publish</SubmitButton>
                <SubmitButton name="intent" value="save" variant="outline" pendingLabel="Saving…">Save draft</SubmitButton>
              </>
            )}
          </div>
        </div>

        <div className="grid gap-3 rounded-xl border bg-card p-4">
          <h2 className="text-base font-bold">Google search result</h2>
          <div className="rounded-lg border p-3" aria-label="Preview of the Google result">
            <p className="truncate text-xs text-[#1e6b3a]">{(storefront ?? 'yourstore.com.au').replace(/^https?:\/\//, '')}/blog/{slug}</p>
            <p className="line-clamp-2 text-[17px] leading-snug text-[#1a0dab]">{snippetTitle}</p>
            <p className="line-clamp-3 text-[13px] text-muted-foreground">{snippetText}</p>
          </div>
          <div>
            <label htmlFor="seo-title" className="field-label">Search title <span className="font-normal text-muted-foreground">(optional)</span></label>
            <Input id="seo-title" name="seoTitle" value={seoTitle} onChange={(e) => setSeoTitle(e.target.value)} maxLength={70} placeholder={title} />
            <Counter value={seoTitle || title} ideal={[30, 60]} max={70} />
          </div>
          <div>
            <label htmlFor="seo-description" className="field-label">Search description</label>
            <Textarea id="seo-description" name="seoDescription" value={seoDescription} onChange={(e) => setSeoDescription(e.target.value)} rows={3} maxLength={170} placeholder={excerpt} />
            <Counter value={seoDescription || excerpt} ideal={[110, 160]} max={170} />
          </div>
          <div>
            <label htmlFor="post-slug" className="field-label">Web address</label>
            <div className="flex items-center gap-1 text-sm"><span className="text-muted-foreground">/blog/</span><Input id="post-slug" name="slug" value={slug} onChange={(e) => setSlug(slugify(e.target.value))} maxLength={80} /></div>
            <FieldError state={state} name="slug" />
            {published && slug !== post.slug && <p className="field-error">Changing the address of a published post breaks links to it that are already out there.</p>}
            {!published && slug !== slugify(title) && <button type="button" onClick={() => setSlug(slugify(title))} className="mt-1 text-xs underline">Match the title</button>}
          </div>
        </div>

        <div className="grid gap-3 rounded-xl border bg-card p-4">
          <div>
            <label htmlFor="related" className="field-label">Show parts for <span className="font-normal text-muted-foreground">(search words)</span></label>
            <Input id="related" name="relatedQuery" defaultValue={post.relatedQuery ?? ''} maxLength={80} placeholder="e.g. brake pads" />
            <p className="field-help">Up to four matching parts appear under the article, linking readers to products.</p>
          </div>
          <div>
            <label htmlFor="author" className="field-label">Author <span className="font-normal text-muted-foreground">(optional)</span></label>
            <Input id="author" name="authorName" defaultValue={post.authorName ?? ''} maxLength={100} placeholder="Parts Finder" />
          </div>
        </div>

        <div className="rounded-xl border border-destructive/30 bg-card p-4">
          {confirmDelete ? (
            <div className="grid gap-2">
              <p className="text-sm">Delete this post for good? {published ? 'It comes off the store immediately.' : ''}</p>
              <div className="flex gap-2">
                <SubmitButton formAction={delAction} variant="destructive" pendingLabel="Deleting…">Delete post</SubmitButton>
                <button type="button" className="min-h-10 px-2 text-sm underline" onClick={() => setConfirmDelete(false)}>Keep it</button>
              </div>
              <FormMessage state={delState} />
            </div>
          ) : (
            <button type="button" onClick={() => setConfirmDelete(true)} className="min-h-10 text-sm font-medium text-destructive underline">Delete this post</button>
          )}
        </div>
      </aside>
    </form>
  )
}
