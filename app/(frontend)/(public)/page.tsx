import type { Metadata } from 'next'
import Footer from './Footer'
import DispatchBanner from './DispatchBanner'
import TapeTabs from './TapeTabs'
import FeatureSlot from './FeatureSlot'
import { getArticles } from '@/lib/db/articles'
import { getTrending } from '@/lib/db/trending'
import './home.css'

export const metadata: Metadata = {
  title: 'The Tape · Atlas Brief',
  description:
    "A running log of Los Angeles real estate — what trades, what's listed, what the numbers actually say. By David Safai.",
}

export default async function HomePage() {
  const articles = await getArticles()
  // Newest article gets the centered lead slot; the rest run as the tape.
  const [lead, ...rest] = articles

  // Trending: rank the articles we already have by reader counts. Anything the
  // ranking names that isn't in the published set (unpublished, deleted) simply
  // drops out, and the lead is excluded so it can't headline twice.
  const trendingRows = await getTrending()
  const bySlug = new Map(articles.map(a => [a.slug, a]))
  const trending = trendingRows
    .map(r => bySlug.get(r.slug))
    .filter((a): a is NonNullable<typeof a> => Boolean(a) && a!.slug !== lead?.slug)

  return (
    <>
      {/* Masthead built to the identity sheet's banner: LA photo on the left,
          red diagonal cut, navy panel carrying the lockup and the positioning
          line. The ghosted A is a pseudo-element on .flag-inner. */}
      <header className="flag">
        <div className="flag-photo" aria-hidden="true" />
        <div className="flag-slash" aria-hidden="true" />
        <div className="flag-inner">
          <div className="flag-lockup">
            <span className="flag-wordmark">Atlas<em>Brief</em></span>
            <span className="flag-tagline">
              Los Angeles<br />Real Estate<br />Intelligence
            </span>
          </div>

          <h1 className="flag-headline">
            What LA Real Estate<br />
            <span className="fh-blue">Insiders Won&apos;t Tell You<span className="fh-dot">.</span></span>
          </h1>

          <p className="flag-kicker">
            <span>Deals</span><span>Capital</span><span>Owners</span>
            <span>Development</span><span>The Operator Take</span>
          </p>

          <div className="flag-right">
            <b>Editor &amp; Publisher</b> &middot; David Safai &middot; Los Angeles, Cal.
          </div>
        </div>
      </header>

      <section className="tape-masthead">
        <div className="wrap">
          <p className="tm-deck">
            A running log of Los Angeles real estate &mdash; what trades, what&apos;s listed, what the
            numbers actually say. Written by David Safai, operator · developer · GC.
          </p>
        </div>
      </section>

      {lead && <FeatureSlot lead={lead} trending={trending} />}

      <section className="tape-feed">
        <div className="wrap">
          <TapeTabs articles={rest} />
        </div>
      </section>

      <DispatchBanner />
      <Footer />
    </>
  )
}
