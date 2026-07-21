import Link from 'next/link'
import type { Post, Media } from '@/payload-types'
import PostBlocks from '../../_blocks/PostBlocks'
import { RefreshRouteOnSave } from '../../_blocks/RefreshRouteOnSave'
import Comments from './Comments'
import TrackView from './TrackView'
import Disclaimer from '../../Disclaimer'
import ArticleSubscribeBar from '../../ArticleSubscribeBar'
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

  return (
    <>
      {showBar && <ArticleSubscribeBar />}
      {/* In the CMS Live Preview iframe, refresh the render on save. Not
          rendered on the public page — only in preview. */}
      {preview && <RefreshRouteOnSave />}
      {/* Don't log a reader view while previewing a draft in the CMS. */}
      {!preview && <TrackView slug={post.slug} />}

      <header className="art-top">
        <div className="wrap">
          <nav className="crumb">
            <Link href="/">Atlas <span style={{ color: 'var(--accent)' }}>Brief</span></Link>
            <span className="sep">/</span>
            <Link href="/atlas-brief">The Tape</Link>
            <span className="sep">/</span>
            <span>{kicker}</span>
          </nav>
          <div className="cat">
            <span>{kicker}</span>
          </div>
          <h1>{post.title}</h1>
          {post.deck && <p className="deck">{post.deck}</p>}
          <div className="byl">
            <div><b>{post.author || 'David Safai'}</b>Editor · Publisher</div>
            {dateStr && <div><b>Published</b>{dateStr}</div>}
          </div>
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

      {!preview && <Comments slug={post.slug} title={post.title} />}

      <footer className="site-footer">
        <div className="wrap">
          <div>
            &copy; 2026 <Link href="/atlas-brief">Atlas Brief</Link> &middot; A publication of Atlas Home Builders, Inc.
          </div>
          <div>{[kicker, dateStr].filter(Boolean).join(' · ')}</div>
          <div style={{ flexBasis: '100%', paddingTop: 16, marginTop: 4, borderTop: '1px solid var(--rule, rgba(0,0,0,0.08))' }}>
            <Disclaimer />
          </div>
        </div>
      </footer>
    </>
  )
}
