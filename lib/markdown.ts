import { Marked, type Tokens } from 'marked'

/*
 * The editor's preview. It renders markdown the same way the storefront does
 * (web/lib/markdown.ts): raw HTML is shown as text, headings start at level 2
 * because the page title is the only h1, and only web, mail and site links work.
 */

const escape = (text: string) => text.replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c]!)

const marked = new Marked({ gfm: true, breaks: false })
marked.use({
  renderer: {
    html(token: Tokens.HTML | Tokens.Tag) {
      return escape(token.text)
    },
    heading(this: { parser: { parseInline: (t: Tokens.Generic[]) => string } }, token: Tokens.Heading) {
      const level = Math.min(6, Math.max(2, token.depth))
      return `<h${level}>${this.parser.parseInline(token.tokens)}</h${level}>\n`
    },
    link(this: { parser: { parseInline: (t: Tokens.Generic[]) => string } }, token: Tokens.Link) {
      const href = token.href ?? ''
      if (!/^(https?:|mailto:|tel:|\/|#)/i.test(href)) return this.parser.parseInline(token.tokens)
      return `<a href="${escape(href)}" target="_blank" rel="noopener">${this.parser.parseInline(token.tokens)}</a>`
    },
    image(token: Tokens.Image) {
      if (!/^https?:\/\//i.test(token.href ?? '')) return ''
      return `<img src="${escape(token.href)}" alt="${escape(token.text ?? '')}">`
    },
  },
})

export function renderMarkdown(md: string): string {
  return marked.parse(md, { async: false }) as string
}

export function wordCount(md: string): number {
  return md.trim().split(/\s+/).filter(Boolean).length
}
