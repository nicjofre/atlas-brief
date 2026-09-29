import type { Metadata } from 'next'
import Link from 'next/link'
import { pageMetadata } from '@/lib/seo/metadata'
import { getArticles, type ArticleCard } from '@/lib/db/articles'
import { getTrending } from '@/lib/db/trending'
import { calmHeadline } from '@/lib/db/headline-case'
import Footer from '../Footer'
import SubscribeForm from './SubscribeForm'
import './subscribe.css'

// /subscribe — the Friday Dispatch's own page. It 404'd until 2026-09-29;
// David asked for a real one: one line on what the newsletter is, a sample
// issue, and some proof.
//
//   - The sample is built on the page from David's most-read pieces this week
//     (the homepage's Most Read ranking), each as a card: kicker, headline,
//     deck, photo. It isn't the rendered email: that template is still on the
//     old palette, and an embedded copy would clash with the page around it.
//     Labelled a sample, because it's what an issue carries, not a specific send.
//   - The proof is David's own standing, set as the Contact page's card sets
//     him: italic name, "Operator · Developer · GC" beneath. No subscriber
//     count and no testimonial until there's a real one to use.
//   - No pop-up or subscribe bar here: the page itself is the signup.

export const dynamic = 'force-dynamic'

// BACKUP (2026-09-29) — the title and description before they were matched to
// the page's headline. Restore by swapping these back in:
//   title: 'Subscribe to the Friday Dispatch · Atlas Brief',
//   description:
//     'Every Friday: what traded in Los Angeles multifamily that week, what it really sold for, and what the numbers say the market is doing. Free, from David Safai.',
export const metadata: Metadata = pageMetadata({
  title: 'Subscribe · Atlas Brief',
  description:
    'A journal of Los Angeles real estate, in your inbox: what traded, what it really sold for, and what the numbers say. Free.',
  path: '/subscribe',
})

const SAMPLE_SIZE = 3

const STATUS: Record<string, string> = {
  sold: 'Sold',
  for_sale: 'For sale',
  under_construction: 'Under construction',
  off_market: 'Off market',
}

// Where and what: "Beverly Grove · Sold". cat_label is empty on most briefs,
// so the email's own "Brief" kicker would repeat on every line here. A
// dispatch has no listing, so it's labelled as one.
function dealKicker(a: ArticleCard): string {
  if (a.kind === 'post') return a.cat_label || 'Dispatch'
  const place = a.listing?.property?.neighborhood || a.listing?.property?.city
  const status = a.listing?.status ? STATUS[a.listing.status] : null
  return [place, status].filter(Boolean).join(' · ') || a.cat_label || 'Brief'
}

export default async function SubscribePage() {
  // Most read first, by distinct readers over the last week — the same ranking
  // the homepage's Most Read uses. Anything it names that's no longer published
  // drops out; if the week is thin, the latest pieces fill the gap.
  const [articles, trendingRows] = await Promise.all([getArticles(), getTrending()])
  const bySlug = new Map(articles.map(a => [a.slug, a]))
  const trending = trendingRows
    .map(r => bySlug.get(r.slug))
    .filter((a): a is ArticleCard => Boolean(a))
  const seen = new Set(trending.map(a => a.slug))
  const sample = [...trending, ...articles.filter(a => !seen.has(a.slug))].slice(0, SAMPLE_SIZE)

  return (
    <>
      <main className="sp">
        <div className="wrap sp-grid">
          <section className="sp-pitch">
            <h1 className="sp-hed">
              A journal of Los Angeles real estate, in your inbox.
            </h1>
            <p className="sp-dek">
              Atlas Brief covers Los Angeles real estate from the owner&rsquo;s side of
              the table: the deals that traded and what they really sold for, the
              listings worth a second look, and what the numbers say about the market,
              development and policy. One email a week. Free.
            </p>

            <SubscribeForm />

            <div className="sp-cred">
              <p className="sp-cred-label">Written by</p>
              <p className="sp-cred-name"><Link href="/contact">David Safai</Link></p>
              <p className="sp-cred-line">Operator &middot; Developer &middot; GC</p>
              <Link href="/about" className="sp-cred-link">About Atlas Brief &rarr;</Link>
            </div>
          </section>

          {sample.length > 0 && (
            <aside className="sp-sample" aria-label="Sample issue">
              <div className="sp-issue">
                <div className="sp-issue-flag">
                  <span className="sp-issue-name">
                    Atlas <em>Brief</em>
                  </span>
                  <span className="sp-issue-title">The Friday Dispatch</span>
                </div>
                <ol className="sp-deals">
                  {sample.map(a => (
                    <li key={a.id} className="sp-deal">
                      <div className="sp-deal-text">
                        <p className="sp-deal-kicker">{dealKicker(a)}</p>
                        <Link href={`/atlas-brief/${a.slug}`} className="sp-deal-hed">
                          {calmHeadline(a.headline)}
                        </Link>
                        {(a.deck || a.excerpt) && <p className="sp-deal-dek">{a.deck ?? a.excerpt}</p>}
                      </div>
                      {a.heroUrl && (
                        <Link href={`/atlas-brief/${a.slug}`} className="sp-deal-img" tabIndex={-1} aria-hidden="true">
                          {/* eslint-disable-next-line @next/next/no-img-element */}
                          <img src={a.heroUrl} alt="" width={240} height={180} loading="lazy" />
                        </Link>
                      )}
                    </li>
                  ))}
                </ol>
              </div>
              <p className="sp-sample-note">
                Built from this week&rsquo;s most-read pieces on Atlas Brief. Every
                story in an issue links through to the full piece.
              </p>
            </aside>
          )}
        </div>
      </main>
      <Footer />
    </>
  )
}
