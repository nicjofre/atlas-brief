import Link from 'next/link'
import type { ArticleCard } from '@/lib/db/articles'
import { calmHeadline } from '@/lib/db/headline-case'
import { hand } from './hand-font'
import './front-top.css'

// The top of the front page (trial 2026-10-12): two-thirds for the latest
// deals, one-third for David's Diary on its own paper-coloured ground. The
// Diary sits at the top of the page, so the moment David publishes, his entry
// is above the fold without displacing the lead deal.

const MONTHS_AP = ['Jan.', 'Feb.', 'March', 'April', 'May', 'June', 'July', 'Aug.', 'Sept.', 'Oct.', 'Nov.', 'Dec.']
function apDate(s: string | null | undefined): string {
  if (!s) return ''
  const d = new Date(s)
  if (Number.isNaN(d.getTime())) return ''
  return `${MONTHS_AP[d.getUTCMonth()]} ${d.getUTCDate()}`
}
const href = (a: ArticleCard) => `/atlas-brief/${a.slug}`
const place = (a: ArticleCard) =>
  a.kind === 'post' ? "Owner's Notes" : a.listing?.property?.neighborhood ?? a.listing?.property?.city ?? 'The Tape'
// The kicker's first item: a deal's place in red text, or, for David's posts,
// a small blue ribbon tag so his entries stand out in the news by date.
function Tag({ a }: { a: ArticleCard }) {
  return a.kind === 'post' ? <span className="ft-diary-tag">{place(a)}</span> : <span>{place(a)}</span>
}
// David's posts run in the news by date like everything else; the kicker names
// them and the headline carries a light-blue highlight so his voice stands out.
function Hed({ a }: { a: ArticleCard }) {
  const text = calmHeadline(a.headline)
  return a.kind === 'post' ? <span className="ft-hl">{text}</span> : <>{text}</>
}

export default function FrontTop({
  deals,
  diary,
  diaryName,
  diaryHref,
  more = [],
}: {
  more?: ArticleCard[]
  deals: ArticleCard[]
  diary: ArticleCard[]
  diaryName: string
  diaryHref: string
}) {
  const [lead, ...rest] = deals
  const [entry, ...earlier] = diary
  if (!lead) return null
  return (
    <section className="ft">
      <div className="wrap ft-grid">
        <div className="ft-main">
        <div className="ft-news">
          <article className="ft-lead">
            {/* Handwritten "Latest" over the lead: the word, then a red line
                drawn out to the photo's right edge. */}
            <div className={`ft-hand-rule ${hand.className}`}>
              <span>Latest</span>
              <svg viewBox="0 0 400 12" preserveAspectRatio="none" aria-hidden="true">
                <path d="M3 7 C 70 3, 140 10, 210 6 S 340 3, 397 7" />
              </svg>
            </div>
            {lead.heroUrl && (
              <Link href={href(lead)} className="ft-lead-img" tabIndex={-1} aria-hidden="true">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={lead.heroUrl} alt="" width={1200} height={675} />
              </Link>
            )}
            <div className="ft-kicker"><Tag a={lead} /><time>{apDate(lead.published_at)}</time></div>
            <h2 className="ft-lead-hed"><Link href={href(lead)}><Hed a={lead} /></Link></h2>
            {(lead.deck || lead.excerpt) && <p className="ft-lead-dek">{lead.deck ?? lead.excerpt}</p>}
          </article>

          <div className="ft-quad">
            {rest.slice(0, 4).map(a => (
              <article key={a.id} className="ft-item">
                <div>
                  <div className="ft-kicker"><Tag a={a} /><time>{apDate(a.published_at)}</time></div>
                  <h3><Link href={href(a)}><Hed a={a} /></Link></h3>
                </div>
                {a.heroUrl && (
                  <Link href={href(a)} className="ft-thumb" tabIndex={-1} aria-hidden="true">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img src={a.heroUrl} alt="" width={240} height={160} loading="lazy" />
                  </Link>
                )}
              </article>
            ))}
          </div>
        </div>

        {/* Older deals, filling the space under the lead and stack beside the
            Diary (which runs longer) instead of a separate band further down. */}
        {more.length > 0 && (
          <section className="ft-tape">
            {/* Same hand-drawn motif as "Latest": the name in the hand (it's
                the link), then the line drawn out to the right. */}
            <h2 className={`ft-hand-rule ft-tape-rule ${hand.className}`}>
              <Link href="/atlas-brief/sections/broker-activity">The Tape</Link>
              <svg viewBox="0 0 400 12" preserveAspectRatio="none" aria-hidden="true">
                <path d="M3 6 C 80 10, 160 3, 240 7 S 350 4, 397 6" />
              </svg>
            </h2>
            <div className="ft-tape-row">
              {more.slice(0, 3).map(a => (
                <article key={a.id} className="ft-card">
                  {a.heroUrl && (
                    <Link href={href(a)} className="ft-card-img" tabIndex={-1} aria-hidden="true">
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img src={a.heroUrl} alt="" width={320} height={180} loading="lazy" />
                    </Link>
                  )}
                  <div className="ft-kicker"><Tag a={a} /><time>{apDate(a.published_at)}</time></div>
                  <h3><Link href={href(a)}>{calmHeadline(a.headline)}</Link></h3>
                </article>
              ))}
            </div>
          </section>
        )}
        </div>

        {entry && (
          <aside className="ft-diary">
            {/* Set as an opinion column, not a card: a rule across the top,
                the name in the logo's Times, and the entries in Times too so
                his writing reads as a voice apart from the Helvetica news. */}
            <header className="ft-diary-head">
              {/* The name on a navy band wider than the box, folding behind it
                  at both ends, with the logo's red line under it. */}
              <h2 className="ft-band"><Link href={diaryHref}>{diaryName}</Link></h2>
              {/* A handwritten note in place of the byline: what the diary is. */}
              <p className={`ft-diary-note ${hand.className}`}>
                Thoughts on operating, building &amp; the LA market
                <svg className="ft-diary-scribble" viewBox="0 0 220 12" preserveAspectRatio="none" aria-hidden="true">
                  <path d="M3 8 C 40 3, 80 11, 120 6 S 190 3, 217 7" />
                </svg>
              </p>
            </header>
            <article className="ft-entry">
              {entry.heroUrl && (
                <Link href={href(entry)} className="ft-entry-img" tabIndex={-1} aria-hidden="true">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src={entry.heroUrl} alt="" width={800} height={450} />
                </Link>
              )}
              <time>{apDate(entry.published_at)}</time>
              <h3><Link href={href(entry)}>{calmHeadline(entry.headline)}</Link></h3>
            </article>
            {earlier.length > 0 && (
              <ul className="ft-earlier">
                {earlier.slice(0, 5).map(a => (
                  <li key={a.id}>
                    <Link href={href(a)}>{calmHeadline(a.headline)}</Link>{' '}
                    <time className="ft-earlier-date">{apDate(a.published_at)}</time>
                  </li>
                ))}
              </ul>
            )}
            <Link href={diaryHref} className="ft-all">More owner's notes</Link>
          </aside>
        )}
      </div>
      {/* The Tape's last row runs the full width, under the Diary too. */}
      {more.length > 3 && (
        <div className="wrap">
          <div className="ft-tape-row ft-tape-wide">
              {more.slice(3, 7).map(a => (
                <article key={a.id} className="ft-card">
                  {a.heroUrl && (
                    <Link href={href(a)} className="ft-card-img" tabIndex={-1} aria-hidden="true">
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img src={a.heroUrl} alt="" width={320} height={180} loading="lazy" />
                    </Link>
                  )}
                  <div className="ft-kicker"><Tag a={a} /><time>{apDate(a.published_at)}</time></div>
                  <h3><Link href={href(a)}>{calmHeadline(a.headline)}</Link></h3>
                </article>
              ))}
          </div>
        </div>
      )}
    </section>
  )
}
