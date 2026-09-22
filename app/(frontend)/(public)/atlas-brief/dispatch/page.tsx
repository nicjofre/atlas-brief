import Link from 'next/link'
import type { Metadata } from 'next'
import { pageMetadata } from '@/lib/seo/metadata'
import Footer from '../../Footer'
import { getArticles, type ArticleCard } from '@/lib/db/articles'
import { calmHeadline } from '@/lib/db/headline-case'
import './dispatch.css'

// PLACEHOLDER — the Dispatch stream's own page, the counterpart to Broker
// Activity. Deliberately thin for now: masthead, then every dispatch newest
// first. What it still needs, when we build it out properly:
//   - the front-page package at the top, as Broker Activity has
//   - a filter, if the dispatches ever carry a category worth filtering on
//   - a rail, or the two-column split the section page uses
// Linked from nowhere yet; the nav repoint comes with the real build.

export const metadata: Metadata = pageMetadata({
  title: 'Dispatch · Atlas Brief',
  description:
    'Every Atlas Brief dispatch — market essays, construction cost reads and policy notes from a Los Angeles owner-operator.',
  path: '/atlas-brief/dispatch',
})

const MONTHS_AP = ['Jan.', 'Feb.', 'March', 'April', 'May', 'June', 'July', 'Aug.', 'Sept.', 'Oct.', 'Nov.', 'Dec.']
function apDate(s: string | null | undefined): string {
  if (!s) return ''
  const d = new Date(s)
  if (Number.isNaN(d.getTime())) return ''
  return `${MONTHS_AP[d.getUTCMonth()]} ${d.getUTCDate()}, ${d.getUTCFullYear()}`
}

export default async function DispatchPage() {
  const all = await getArticles()
  const posts: ArticleCard[] = all.filter(a => a.kind === 'post')

  return (
    <>
      <header className="dp-masthead">
        <div className="dp-masthead-inner">
          <div className="dp-eyebrow">Atlas Brief</div>
          <h1>Dis<em>patch</em></h1>
          <p className="dp-dek">
            Market essays, construction cost reads and policy notes — written from the
            field by an owner-operator, not a brokerage desk.
          </p>
          <div className="dp-meta">
            <span>{posts.length} entries</span>
            <span>Every Friday</span>
          </div>
        </div>
      </header>

      <section className="dp-feed">
        <div className="wrap">
          {posts.length === 0 ? (
            <p className="dp-empty">Nothing published yet.</p>
          ) : (
            <div className="dp-list">
              {posts.map(a => (
                <Link key={a.id} href={`/atlas-brief/${a.slug}`} className="dp-row">
                  <div className="dp-text">
                    <div className="dp-kicker">
                      <span>{a.cat_label ?? 'Dispatch'}</span>
                      <time dateTime={a.published_at ?? undefined}>{apDate(a.published_at)}</time>
                    </div>
                    <h2>{calmHeadline(a.headline)}</h2>
                    {(a.excerpt ?? a.deck) && <p className="dp-deck">{a.excerpt ?? a.deck}</p>}
                  </div>
                  {a.heroUrl && (
                    <div className="dp-thumb">
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img src={a.heroUrl} alt="" width={200} height={134} loading="lazy" />
                    </div>
                  )}
                </Link>
              ))}
            </div>
          )}
        </div>
      </section>

      <Footer />
    </>
  )
}
