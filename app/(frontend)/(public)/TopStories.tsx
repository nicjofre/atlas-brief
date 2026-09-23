import Link from 'next/link'
import type { ArticleCard } from '@/lib/db/articles'
import { calmHeadline } from '@/lib/db/headline-case'
import './top-stories.css'

// The front-page package under the masthead: the newest story runs large on
// the left, the next four stack beside it with thumbnails, and the week's
// most-read pieces make a numbered column on the right. Replaces the single
// centred lead (FeatureSlot) — that file is kept for now in case we go back.
//
// Selection is by date for now. A hand-picked "featured" flag would need a
// column on articles and posts, so it waits until this layout is agreed.

const MONTHS_AP = ['Jan.', 'Feb.', 'March', 'April', 'May', 'June', 'July', 'Aug.', 'Sept.', 'Oct.', 'Nov.', 'Dec.']
function apDate(s: string | null | undefined): string {
  if (!s) return ''
  const d = new Date(s)
  if (Number.isNaN(d.getTime())) return ''
  return `${MONTHS_AP[d.getUTCMonth()]} ${d.getUTCDate()}`
}

function kicker(a: ArticleCard): string {
  if (a.kind === 'post') return a.cat_label ?? 'Dispatch'
  const p = a.listing?.property
  return p?.neighborhood ?? p?.city ?? 'The Tape'
}


export default function TopStories({
  lead,
  stack,
  mostRead,
  leadLabel,
  stackLabel,
}: {
  lead: ArticleCard
  stack: ArticleCard[]
  mostRead: ArticleCard[]
  // Optional column headings. The front page runs without them — the masthead
  // says what the package is — but a section page uses them to divide the
  // newest entry from the rest of the week.
  leadLabel?: string
  stackLabel?: string
}) {
  const hasMostRead = mostRead.length >= 3
  return (
    <section className={`top-stories${hasMostRead ? '' : ' no-rail'}`}>
      <div className="wrap">
        <div className="ts-grid">
          <article className="ts-lead">
            {leadLabel && <h3 className="ts-col-hed">{leadLabel}</h3>}
            {lead.heroUrl && (
              <Link href={`/atlas-brief/${lead.slug}`} className="ts-lead-img" tabIndex={-1} aria-hidden="true">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={lead.heroUrl} alt="" width={1200} height={675} />
              </Link>
            )}
            <div className="ts-kicker">
              <span>{kicker(lead)}</span>
              <time>{apDate(lead.published_at)}</time>
            </div>
            <h3 className="ts-lead-hed">
              <Link href={`/atlas-brief/${lead.slug}`}>{calmHeadline(lead.headline)}</Link>
            </h3>
            {(lead.deck || lead.excerpt) && <p className="ts-lead-dek">{lead.deck ?? lead.excerpt}</p>}
          </article>

          <div className="ts-stack">
            {stackLabel && <h3 className="ts-col-hed">{stackLabel}</h3>}
            {stack.map(a => (
              <article key={a.id} className="ts-item">
                <div className="ts-item-text">
                  <div className="ts-kicker">
                    <span>{kicker(a)}</span>
                    <time>{apDate(a.published_at)}</time>
                  </div>
                  <h3 className="ts-item-hed">
                    <Link href={`/atlas-brief/${a.slug}`}>{calmHeadline(a.headline)}</Link>
                  </h3>
                </div>
                {a.heroUrl && (
                  <Link href={`/atlas-brief/${a.slug}`} className="ts-item-img" tabIndex={-1} aria-hidden="true">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img src={a.heroUrl} alt="" width={240} height={160} loading="lazy" />
                  </Link>
                )}
              </article>
            ))}
          </div>

          {hasMostRead && (
            <aside className="ts-rail">
              <h3 className="ts-rail-hed">Most Read</h3>
              <ol>
                {mostRead.slice(0, 5).map(a => (
                  <li key={a.id}>
                    <Link href={`/atlas-brief/${a.slug}`}>{calmHeadline(a.headline)}</Link>
                  </li>
                ))}
              </ol>
            </aside>
          )}
        </div>
      </div>
    </section>
  )
}
