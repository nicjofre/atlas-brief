import Link from 'next/link'
import type { ArticleCard } from '@/lib/db/articles'
import { calmHeadline } from '@/lib/db/headline-case'
import { statusBadgeKey, statusKicker } from '@/lib/db/article-render'

// The centre package, built the way a broadsheet arranges a page: a row of Tape
// cards across the top, two features beneath them — the deal on the left, the
// dispatch on the right — and a row of Dispatch cards under those. The streams
// are colour-coded by kicker and rule; the cards stay white so they don't fight
// the masthead.

const MONTHS_AP = ['Jan.', 'Feb.', 'March', 'April', 'May', 'June', 'July', 'Aug.', 'Sept.', 'Oct.', 'Nov.', 'Dec.']
function apDate(s: string | null | undefined): string {
  if (!s) return ''
  const d = new Date(s)
  if (Number.isNaN(d.getTime())) return ''
  return `${MONTHS_AP[d.getUTCMonth()]} ${d.getUTCDate()}`
}

const isPost = (a: ArticleCard) => a.kind === 'post'

function kickerFor(a: ArticleCard): string {
  if (isPost(a)) return a.cat_label ?? 'Dispatch'
  const p = a.listing?.property ?? null
  return [statusKicker(a.listing?.status), p?.neighborhood ?? p?.city].filter(Boolean).join(' · ')
}

function Card({ a, size }: { a: ArticleCard; size: 'sm' | 'lg' }) {
  const stream = isPost(a) ? 'dispatch' : 'tape'
  return (
    <article className={`cp-card cp-${size}`}>
      {a.heroUrl && (
        <Link href={`/atlas-brief/${a.slug}`} className="cp-thumb" tabIndex={-1} aria-hidden="true">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={a.heroUrl}
            alt=""
            loading="lazy"
            width={size === 'lg' ? 720 : 320}
            height={size === 'lg' ? 405 : 180}
          />
        </Link>
      )}
      <div className="cp-meta">
        <span className={`cp-kicker cp-kicker-${stream}`}>{kickerFor(a)}</span>
        <time>{apDate(a.published_at)}</time>
      </div>
      <h3 className="cp-hed">
        <Link href={`/atlas-brief/${a.slug}`}>{calmHeadline(a.headline)}</Link>
      </h3>
      {size === 'lg' && (a.deck || a.excerpt) && <p className="cp-dek">{a.deck ?? a.excerpt}</p>}
      {/* The address line (street · city · year built) came off the homepage
          cards 2026-10-07; the brief page itself still leads with it. */}
      {!isPost(a) && a.listing?.status && (
        <span className={`badge badge-${statusBadgeKey(a.listing.status)} cp-badge`}>
          {statusKicker(a.listing.status)}
        </span>
      )}
    </article>
  )
}

export default function CenterPackage({
  tape,
  dispatch,
}: {
  tape: ArticleCard[]
  dispatch: ArticleCard[]
}) {
  // Each stream is its heading and a row of five. The feature pair that sat
  // between the two rows (newest deal + newest dispatch, picked by date, not by
  // anyone) came out 2026-10-07: it had no heading of its own, so the Dispatch
  // feature read as part of The Tape.
  if (!tape.length && !dispatch.length) return null

  return (
    <section className="cp">
      <div className="wrap">
        <div className="cp-band cp-band-tape">
          <div className="cp-head">
            <h2>The Tape</h2>
            <Link href="/atlas-brief/sections/broker-activity">All the tape →</Link>
          </div>
          <div className="cp-row">
            {tape.slice(0, 5).map(a => <Card key={a.id} a={a} size="sm" />)}
          </div>
        </div>

        <div className="cp-band cp-band-dispatch">
          <div className="cp-head">
            <h2>Dispatch</h2>
            <Link href="/atlas-brief/dispatch">All dispatches →</Link>
          </div>
          <div className="cp-row">
            {dispatch.slice(0, 5).map(a => <Card key={a.id} a={a} size="sm" />)}
          </div>
        </div>
      </div>
    </section>
  )
}
