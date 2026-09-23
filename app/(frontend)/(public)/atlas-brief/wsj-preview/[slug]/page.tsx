// UNTOUCHED BASELINE: this file is Nic's (commit e9d9421) and was unmodified as
// of 44a0706. Anything Atlas Brief adds below is marked. To see the original:
//     git show 44a0706:'app/(frontend)/(public)/atlas-brief/wsj-preview/[slug]/page.tsx'
// It isn't copied inline — at 347 lines a duplicate would double the file and
// conflict the next time Nic edits it. The stylesheet beside it does carry a
// full snapshot, since that's what we restyle.

import Link from 'next/link'
import { notFound } from 'next/navigation'
import { draftMode } from 'next/headers'   // ATLAS BRIEF ADDITION
import type { ReactNode } from 'react'
import { getArticleBySlug, getArticles, type ArticleCard } from '@/lib/db/articles'
import { getPostBySlug } from '@/lib/getPost'
import { HeadlineText, stripBrokersBlock, sectionLabel } from '@/lib/db/article-render'
import { resolveHeroUrl } from '@/lib/db/hero-url'
import { isAllCaps, sentenceCase, calmHeadline } from '@/lib/db/headline-case'
import { createClient } from '@/lib/supabase/server'
import type { Media, Post } from '@/payload-types'
import PostBlocks from '../../../_blocks/PostBlocks'
import Footer from '../../../Footer'
// ADDED BY ATLAS BRIEF (2026-09-16)
import WsjSubscribe from './WsjSubscribe'
import ArticleSubscribeModal from '../../../ArticleSubscribeModal'
import './wsj.css'

// PREVIEW ONLY — a Wall Street Journal-style treatment of a single article, so
// the look can be judged on real content before it replaces the shared
// template at /atlas-brief/[slug]. Nothing here is linked from the site and
// nothing in the schema changed. Works for a freeform Post or a Tape brief.

export const metadata = { robots: { index: false, follow: false } }

type Fact = { k: string; v: string }

type Article = {
  section: string
  sectionHref: string
  title: ReactNode
  deck: string | null
  author: string
  publishedAt: string | null
  heroUrl: string | null
  heroAlt: string
  heroCaption: string | null
  body: ReactNode
  words: number
  facts: Fact[]
}

const MONTHS_AP = ['Jan.', 'Feb.', 'March', 'April', 'May', 'June', 'July', 'Aug.', 'Sept.', 'Oct.', 'Nov.', 'Dec.']

// AP-style date, the way a newspaper timestamps a story: "Sept. 9, 2026".
function apDate(s: string | null | undefined): string {
  if (!s) return ''
  const d = new Date(s)
  if (Number.isNaN(d.getTime())) return ''
  return `${MONTHS_AP[d.getUTCMonth()]} ${d.getUTCDate()}, ${d.getUTCFullYear()}`
}

function asMedia(v: unknown): Media | null {
  return v && typeof v === 'object' ? (v as Media) : null
}

// Word count over every `text` node in a Lexical block tree, without
// rendering it. Good enough for a "5 min read" figure.
function countLexicalWords(v: unknown): number {
  if (!v || typeof v !== 'object') return 0
  if (Array.isArray(v)) return v.reduce((n, x) => n + countLexicalWords(x), 0)
  const o = v as Record<string, unknown>
  let n = 0
  if (typeof o.text === 'string') n += o.text.split(/\s+/).filter(Boolean).length
  for (const k of Object.keys(o)) if (k !== 'text') n += countLexicalWords(o[k])
  return n
}

type LexNode = { type?: string; text?: string; children?: LexNode[]; [k: string]: unknown }

function nodeWords(n: LexNode): number {
  if (typeof n.text === 'string') return n.text.split(/\s+/).filter(Boolean).length
  return (n.children ?? []).reduce((c, k) => c + nodeWords(k), 0)
}

// David writes one sentence per paragraph. On the page each one gets a full
// paragraph gap, so the copy reads as bullet points. A newspaper would set
// the same sentences as paragraphs of three or four. This joins runs of short
// paragraphs (under SHORT words each) until a paragraph reaches TARGET words,
// breaking at headings, lists, and quotes. Render-time only.
const SHORT = 40
const TARGET = 70
function mergeShortParagraphs(root: LexNode): LexNode {
  const out: LexNode[] = []
  let acc: LexNode | null = null
  for (const n of root.children ?? []) {
    const words = nodeWords(n)
    const mergeable = n.type === 'paragraph' && words > 0 && words < SHORT
    if (mergeable && acc && nodeWords(acc) + words <= TARGET) {
      acc.children = [...(acc.children ?? []), { type: 'text', text: ' ', version: 1, format: 0, mode: 'normal', style: '', detail: 0 }, ...(n.children ?? [])]
      continue
    }
    acc = mergeable ? { ...n, children: [...(n.children ?? [])] } : null
    out.push(acc ?? (n.type === 'heading' ? lowerHeading(n) : n))
  }
  return { ...root, children: out }
}

// Subheads arrive typed in capitals ("WHY IS THE WAITLIST 30+ YEARS?"); any
// heading that is entirely upper case is set in sentence case instead.
function headingText(n: LexNode): string {
  return typeof n.text === 'string' ? n.text : (n.children ?? []).map(headingText).join('')
}
function lowerHeading(n: LexNode): LexNode {
  const all = headingText(n)
  if (!isAllCaps(all)) return n
  let first = true
  const walk = (k: LexNode): LexNode => {
    if (typeof k.text === 'string') {
      const t = sentenceCase(k.text, first)
      if (/[A-Za-z]/.test(k.text)) first = false
      return { ...k, text: t }
    }
    return k.children ? { ...k, children: k.children.map(walk) } : k
  }
  return walk(n)
}

type Layout = NonNullable<Post['layout']>
function mergeLayout(layout: Post['layout']): Post['layout'] {
  if (!layout) return layout
  return layout.map(b => {
    if (b.blockType !== 'richText' || !b.content?.root) return b
    const root = mergeShortParagraphs(b.content.root as unknown as LexNode) as unknown as typeof b.content.root
    return { ...b, content: { ...b.content, root } }
  }) as Layout
}

function countHtmlWords(html: string): number {
  return html.replace(/<[^>]+>/g, ' ').split(/\s+/).filter(Boolean).length
}

// A caption like "Photo via Marcus & Millichap" is a credit, not a caption.
// WSJ sets the two differently, so split them apart.
function splitCaption(raw: string | null | undefined): { caption: string | null; credit: string | null } {
  if (!raw) return { caption: null, credit: null }
  const clean = raw.replace(/^FIG\.?\s*\d+\s*,?\s*/i, '').trim()
  const m = clean.match(/^(?:photo|image|rendering)\s*(?:via|by|courtesy of|:)\s*(.+)$/i)
  if (m) return { caption: null, credit: m[1].trim() }
  const tail = clean.match(/^(.*?)\s*[\(\[]\s*(?:photo|image)\s*(?:via|by|:)\s*(.+?)\s*[\)\]]\s*$/i)
  if (tail) return { caption: tail[1].trim() || null, credit: tail[2].trim() }
  return { caption: clean, credit: null }
}

const fmtMoney = (n: number | null | undefined) =>
  n == null ? null : n >= 1_000_000 ? `$${(n / 1_000_000).toFixed(2).replace(/\.?0+$/, '')}M` : `$${Math.round(n).toLocaleString('en-US')}`
const fmtPct = (n: number | null | undefined) => (n == null ? null : `${(n > 1 ? n : n * 100).toFixed(2)}%`)

function postToArticle(post: Post): Article {
  const hero = asMedia(post.heroImage)
  return {
    section: post.kicker || 'Dispatch',
    // ATLAS BRIEF (2026-09-22): was '/atlas-brief', which 308s to the
    // homepage now. A dispatch's section link belongs on the Dispatch archive.
    sectionHref: '/atlas-brief/dispatch',
    title: calmHeadline(post.title),
    deck: post.deck ?? null,
    author: post.author || 'David Safai',
    publishedAt: post.publishedAt ?? null,
    heroUrl: hero?.url ?? null,
    heroAlt: hero?.alt || post.title,
    heroCaption: post.heroCaption ?? null,
    body: <PostBlocks blocks={mergeLayout(post.layout)} />,
    words: countLexicalWords(post.layout),
    facts: [],
  }
}

async function briefToArticle(slug: string): Promise<Article | null> {
  const article = await getArticleBySlug(slug)
  if (!article) return null
  const supabase = await createClient()
  const listing = article.listing
  const p = listing?.property
  const body = stripBrokersBlock(article.body_html)

  const facts: Fact[] = []
  const push = (k: string, v: string | null | undefined) => v && facts.push({ k, v })
  push('Address', p?.street_address)
  push('Neighborhood', p?.neighborhood ?? p?.city)
  push('Units', p?.unit_count != null ? String(p.unit_count) : null)
  push('Year built', p?.year_built != null ? String(p.year_built) : null)
  push(listing?.status === 'sold' ? 'Sale price' : 'Asking price', fmtMoney(listing?.sale_price ?? listing?.list_price))
  // Per-door and yield figures only mean something on a multifamily deal.
  if ((p?.unit_count ?? 0) > 1) {
    push('Per unit', fmtMoney(listing?.price_per_unit))
    push('Cap rate', fmtPct(listing?.cap_rate_current))
    push('GRM', listing?.grm_current != null ? listing.grm_current.toFixed(1) : null)
  }

  return {
    // ATLAS BRIEF (2026-09-22): was a ternary mapping broker-activity to
    // "Broker Activity" and everything else to "The Tape". Both arms are the
    // same stream; sectionLabel() is the one definition now.
    section: sectionLabel(article.section_slug),
    sectionHref: `/atlas-brief/sections/${article.section_slug}`,
    title: <HeadlineText text={article.headline} />,
    deck: article.deck,
    author: 'David Safai',
    publishedAt: article.published_at,
    heroUrl: resolveHeroUrl(supabase, article.hero_photo_url ?? listing?.hero_photo_url ?? null),
    heroAlt: `${p?.street_address ?? 'Listing'} photo`,
    heroCaption: article.hero_caption,
    body: <div className="prose" dangerouslySetInnerHTML={{ __html: body }} />,
    words: countHtmlWords(body),
    facts,
  }
}

export default async function WsjPreviewPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params
  // ATLAS BRIEF ADDITION (2026-09-22): draft awareness. Nic's original called
  // getPostBySlug(slug) with no flag, which was right while this route was a
  // preview nobody edited through. The canonical /atlas-brief/[slug] renders
  // this template for dispatches now, and that route is what the CMS opens for
  // Live Preview — without the flag David would see the last published version
  // while editing, or a 404 on a post that has never been published.
  const { isEnabled: draft } = await draftMode()
  const post = await getPostBySlug(slug, draft)
  const a = post ? postToArticle(post) : await briefToArticle(slug)
  if (!a) notFound()

  const others = (await getArticles()).filter(c => c.slug !== slug)
  const popular = others.slice(0, 5)
  // Read-next cards carry a photo, so skip the ones without one.
  const readNext = others.slice(5).filter(c => c.heroUrl).slice(0, 4)
  const { caption, credit } = splitCaption(a.heroCaption)
  const minutes = Math.max(1, Math.round(a.words / 230))
  const date = apDate(a.publishedAt)

  return (
    <>
      {/* ADDED BY ATLAS BRIEF (2026-09-16): the site's signup pop-up, which the
          Subscribe buttons open. enabled={false} keeps its own scroll trigger
          off here — on this route it opens only when asked. */}
      <ArticleSubscribeModal enabled={false} slug={slug} />
      <div className="wsj">
        <header className="wsj-head">
          <Link href={a.sectionHref} className="wsj-flag">{a.section}</Link>
          <h1 className="wsj-hed">{a.title}</h1>
          {a.deck && <p className="wsj-dek">{a.deck}</p>}
          <div className="wsj-byline">
            <div className="wsj-by">
              <span>By <b>{a.author}</b></span>
              <a href="mailto:David@AtlasBrief.La" className="wsj-follow">Follow</a>
            </div>
            {date && <time className="wsj-time" dateTime={a.publishedAt ?? undefined}>{date} 6:00 am PT</time>}
            <div className="wsj-tools">
              {/* ADDED BY ATLAS BRIEF (2026-09-16) */}
              <WsjSubscribe variant="tool" />
              <button type="button"><ShareIcon />Share</button>
              <button type="button"><TextIcon />Text</button>
              <button type="button"><ClockIcon />{minutes} min read</button>
            </div>
          </div>
        </header>

        <div className="wsj-grid">
          <div className="wsj-main">
            {a.heroUrl && (
              <figure className="wsj-hero">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={a.heroUrl} alt={a.heroAlt} width={1600} height={1067} />
                {(caption || credit) && (
                  <figcaption>
                    {caption && <span className="wsj-cap">{caption}</span>}
                    {credit && <span className="wsj-credit">Photo: {credit}</span>}
                  </figcaption>
                )}
              </figure>
            )}

            {a.facts.length > 0 && (
              <aside className="wsj-facts">
                <h2>At a glance</h2>
                <dl>
                  {a.facts.map(f => (
                    <div key={f.k}><dt>{f.k}</dt><dd>{f.v}</dd></div>
                  ))}
                </dl>
              </aside>
            )}

            {/* ATLAS BRIEF (2026-09-23): `art-body` added. Not styling — it's
                the hook ArticleSubscribeModal measures to know when a reader
                has got far enough into the prose to be worth asking for an
                email. One wrapper covers both body shapes, the Lexical blocks
                and the brief HTML. */}
            <div className="wsj-text art-body">
              {a.body}
              {/* ADDED BY ATLAS BRIEF (2026-09-16): the sign-off lines run left,
                  the subscribe button sits opposite them. */}
              <div className="wsj-signoff">
                <div>
                  <p className="wsj-writeto">
                    Write to {a.author} at <a href="mailto:David@AtlasBrief.La">David@AtlasBrief.La</a>
                  </p>
                  {date && (
                    <p className="wsj-appeared">
                      Appeared in the {date} edition of The Tape.
                    </p>
                  )}
                </div>
                <WsjSubscribe variant="foot" />
              </div>
            </div>
          </div>

          <aside className="wsj-rail">
            {popular.length > 0 && (
              <section className="wsj-popular">
                <h2>Most Popular</h2>
                <ol>
                  {popular.map(c => (
                    <li key={c.id}>
                      <Link href={`/atlas-brief/${c.slug}`}>
                        <span className="wsj-pop-hed">{calmHeadline(c.headline)}</span>
                        {c.heroUrl && (
                          // eslint-disable-next-line @next/next/no-img-element
                          <img src={c.heroUrl} alt="" loading="lazy" />
                        )}
                      </Link>
                    </li>
                  ))}
                </ol>
              </section>
            )}
            <section className="wsj-signup">
              <h2>The Friday Dispatch</h2>
              <p>One note a week from David on what traded, what&rsquo;s listed, and what the numbers say. Free.</p>
              <Link href="/#dispatch" className="wsj-signup-btn">Sign up</Link>
            </section>
          </aside>
        </div>

        {readNext.length > 0 && (
          <section className="wsj-next">
            <h2>What to Read Next</h2>
            <div className="wsj-next-grid">
              {readNext.map(c => <NextCard key={c.id} c={c} />)}
            </div>
          </section>
        )}
      </div>
      <Footer />
    </>
  )
}

function NextCard({ c }: { c: ArticleCard }) {
  const sec = c.kind === 'post' ? c.cat_label : c.listing?.property?.neighborhood ?? c.listing?.property?.city ?? 'The Tape'
  return (
    <Link href={`/atlas-brief/${c.slug}`} className="wsj-next-card">
      {c.heroUrl ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img src={c.heroUrl} alt="" loading="lazy" />
      ) : (
        <div className="wsj-next-noimg" />
      )}
      <span className="wsj-next-sec">{sec}</span>
      <span className="wsj-next-hed">{calmHeadline(c.headline)}</span>
      <span className="wsj-next-time">{apDate(c.published_at)}</span>
    </Link>
  )
}

function ShareIcon() {
  return (
    <svg viewBox="0 0 16 16" aria-hidden="true"><path d="M11 1.5a2 2 0 1 1 .4 1.2L6 5.6a2 2 0 0 1 0 .8l5.4 2.9a2 2 0 1 1-.5.9L5.5 7.3a2 2 0 1 1 0-2.6L11 1.8v-.3Z"/></svg>
  )
}
function TextIcon() {
  return (
    <svg viewBox="0 0 16 16" aria-hidden="true"><path d="M1 3h9v2H6.5v9h-2V5H1V3Zm9.5 4H15v1.6h-1.8V14h-1.7V8.6h-2V7Z"/></svg>
  )
}
function ClockIcon() {
  return (
    <svg viewBox="0 0 16 16" aria-hidden="true"><path d="M8 1a7 7 0 1 1 0 14A7 7 0 0 1 8 1Zm0 1.4a5.6 5.6 0 1 0 0 11.2A5.6 5.6 0 0 0 8 2.4ZM7.3 4h1.4v3.7l2.6 1.5-.7 1.2-3.3-1.9V4Z"/></svg>
  )
}
