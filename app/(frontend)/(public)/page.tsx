/* ===========================================================================
   SNAPSHOT — the homepage component as it stood before the 2026-09-17 pass
   (commit ad8c159). Paste back to restore. Comments stripped so the wrapper
   can't close early.

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
         {}
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
   =========================================================================== */

import type { Metadata } from 'next'
import { pageMetadata } from '@/lib/seo/metadata'
import Footer from './Footer'
import DispatchBanner from './DispatchBanner'
import CenterPackage from './CenterPackage'
import TopStories from './TopStories'
import FlagTicker from './FlagTicker'
import { getArticles } from '@/lib/db/articles'
import { getTrending } from '@/lib/db/trending'
import './home.css'

// The front page names the publication, not a stream. It used to read "The
// Tape · Atlas Brief", from when the homepage WAS the Tape — but The Tape got
// its own page on 2026-09-21 and its masthead rename gave that page the same
// title, so two pages claimed to be the same thing. Same duplicate signal the
// /atlas-brief retirement was fixing.
//
// The title matches the masthead: Atlas Brief over "A Journal of Los Angeles
// Real Estate".
export const metadata: Metadata = pageMetadata({
  title: 'Atlas Brief · A Journal of Los Angeles Real Estate',
  description:
    "An owner-builder's journal of Los Angeles real estate. What traded, what's listed, and what the numbers actually say — by David Safai.",
  path: '/',
})

export default async function HomePage() {
  const articles = await getArticles()
  // The five newest make the Top Stories package (one lead, four stacked);
  // everything after runs as the tape.
  const [lead, ...afterLead] = articles
  const stack = afterLead.slice(0, 4)
  const rest = afterLead.slice(4)
  // One feature plus five cards per stream, drawn from what the package above
  // hasn't already used, so nothing headlines twice on one page.
  const tapeCards = rest.filter(a => a.kind !== 'post').slice(0, 6)
  const dispatchCards = rest.filter(a => a.kind === 'post').slice(0, 6)

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
      {/* The masthead is the wordmark, as a paper's is: the name large and
          centred on the navy, a rule under it, and the dateline beneath. What
          was here — a skyline photo, a red diagonal, a ghosted A watermark and
          a slogan — was four devices doing the job of one. */}
      <header className="flag">
        <div className="flag-inner">
          <h1 className="flag-wordmark">Atlas <em>Brief</em></h1>
          <p className="flag-dateline">A Journal of Los Angeles Real Estate</p>
        </div>
      </header>

      <FlagTicker />

      {lead && <TopStories lead={lead} stack={stack} mostRead={trending} />}

      {/* The centre package, arranged the way a broadsheet arranges a page: a
          row of Tape cards, two features — the deal on the left, the dispatch
          on the right — and a row of Dispatch cards beneath them. */}
      <CenterPackage tape={tapeCards} dispatch={dispatchCards} />

      <DispatchBanner />
      <Footer />
    </>
  )
}
