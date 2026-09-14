import type { Metadata } from 'next'
import { pageMetadata } from '@/lib/seo/metadata'
import Footer from './Footer'
import DispatchBanner from './DispatchBanner'
import TapeTabs from './TapeTabs'
import TopStories from './TopStories'
import { getArticles } from '@/lib/db/articles'
import { getTrending } from '@/lib/db/trending'
import './home.css'

export const metadata: Metadata = pageMetadata({
  title: 'The Tape · Atlas Brief',
  description:
    "A running log of Los Angeles real estate — what trades, what's listed, what the numbers actually say. By David Safai.",
  path: '/',
})

export default async function HomePage() {
  const articles = await getArticles()
  // The five newest make the Top Stories package (one lead, four stacked);
  // everything after runs as the tape.
  const [lead, ...afterLead] = articles
  const stack = afterLead.slice(0, 4)
  const rest = afterLead.slice(4)

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
      {/* Masthead cut to the banner from the identity sheet: LA photo, red
          diagonal, navy panel. Only the positioning line lives on it now — the
          lockup is already in the nav, and the topics strip, editor line and
          mission statement that used to follow were cut so the stories start
          one scroll sooner. */}
      <header className="flag">
        <div className="flag-photo" aria-hidden="true" />
        <div className="flag-slash" aria-hidden="true" />
        <div className="flag-inner">
          <h1 className="flag-headline">
            LA Real Estate,<br />
            <span className="fh-blue">Read by Someone<br />Who Owns It<span className="fh-dot">.</span></span>
          </h1>
        </div>
      </header>

      {lead && <TopStories lead={lead} stack={stack} mostRead={trending} />}

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
