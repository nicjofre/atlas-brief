import Link from 'next/link'
import type { Post, Media } from '@/payload-types'
import PostBlocks from '../../_blocks/PostBlocks'
import { RefreshRouteOnSave } from '../../_blocks/RefreshRouteOnSave'
import Footer from '../../Footer'
import ArticleSubscribeBar from '../../ArticleSubscribeBar'
import ArticleSubscribeModal from '../../ArticleSubscribeModal'
import ArticleSignupBox from '../../ArticleSignupBox'
import { JsonLd, articleGraph, breadcrumbGraph } from '@/lib/seo/json-ld'
import './post.css'

function fmtDate(s: string | null | undefined): string {
  if (!s) return ''
  const d = new Date(s)
  if (Number.isNaN(d.getTime())) return ''
  const months = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December']
  return `${months[d.getUTCMonth()]} ${d.getUTCDate()}, ${d.getUTCFullYear()}`
}

function asMedia(v: unknown): Media | null {
  return v && typeof v === 'object' ? (v as Media) : null
}

// Public render for a freeform Post. Shares the article chrome (post.css) with
// briefs — crumb, kicker, headline, deck, byline, hero — but the body is the
// composed block layout instead of the fixed brief sections.
export default function FreeformPost({ post, preview = false, showBar = false }: { post: Post; preview?: boolean; showBar?: boolean }) {
  const hero = asMedia(post.heroImage)
  const kicker = post.kicker || 'Dispatch'
  const dateStr = fmtDate(post.publishedAt)
  // Set only on essays about a specific building (the CMS field is optional).
  const address = post.propertyAddress?.trim() || null
  const locality = post.propertyLocality?.trim() || null

  return (
    <>
      {/* Structured data for the essay. Skipped in the CMS preview iframe,
          which isn't a public URL. */}
      {!preview && (
        <JsonLd
          data={articleGraph({
            headline: post.title ?? '',
            description: post.deck,
            path: `/atlas-brief/${post.slug}`,
            datePublished: post.publishedAt ?? post.createdAt,
            dateModified: post.updatedAt,
            images: [hero?.url],
            section: kicker,
            // Names the building when the essay is about one, so an address
            // query can resolve to this page.
            address: address ? { streetAddress: address, locality } : null,
          })}
        />
      )}
      {!preview && (
        <JsonLd
          data={breadcrumbGraph([
            { name: 'Atlas Brief', path: '/' },
            { name: 'The Tape', path: '/atlas-brief' },
          ])}
        />
      )}
      {showBar && <ArticleSubscribeBar slug={post.slug} />}
      {/* Never in the CMS Live Preview iframe — a pop-up firing mid-edit would
          just be in David's way. */}
      {!preview && <ArticleSubscribeModal enabled={showBar} slug={post.slug} />}
      {/* In the CMS Live Preview iframe, refresh the render on save. Not
          rendered on the public page — only in preview. */}
      {preview && <RefreshRouteOnSave />}

      <header className="art-top">
        <div className="wrap">
          <nav className="crumb">
            <Link href="/">Atlas <span className="crumb-mark">Brief</span></Link>
            <span className="sep">/</span>
            <Link href="/atlas-brief">The Tape</Link>
            <span className="sep">/</span>
            <span>{kicker}</span>
          </nav>
          <div className="cat">
            <span>{kicker}</span>
            {dateStr && <span className="cat-date">{dateStr}</span>}
          </div>
          <h1>{post.title}</h1>
          {post.deck && <p className="deck">{post.deck}</p>}
          <div className="byl">
            {/* Matches the brief layout: the building leads, when there is one. */}
            {address && <div><b>Property</b>{address}</div>}
            <div><b>{post.author || 'David Safai'}</b>Editor · Publisher</div>
            {dateStr && <div><b>Published</b>{dateStr}</div>}
            {address && locality && <div><b>Dateline</b>{locality}</div>}
          </div>
          {/* Not in the CMS preview iframe — David is editing, not reading. */}
          {!preview && <ArticleSignupBox slug={post.slug} enabled={showBar} />}
        </div>
      </header>

      {hero?.url && (
        <section className="art-lead">
          <div className="wrap">
            <figure className="lead-photo">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={hero.url} alt={hero.alt || post.title} width={1600} height={1067} />
              {post.heroCaption && <figcaption className="cap">{post.heroCaption}</figcaption>}
            </figure>
          </div>
        </section>
      )}

      <section className="art-body">
        <div className="wrap">
          <div className="post-body-col">
            <PostBlocks blocks={post.layout} />
          </div>
        </div>
      </section>

      <Footer />
    </>
  )
}
