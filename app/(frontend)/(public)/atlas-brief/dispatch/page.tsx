import type { Metadata } from 'next'
import { pageMetadata } from '@/lib/seo/metadata'
import Footer from '../../Footer'
import { getArticles, type ArticleCard } from '@/lib/db/articles'
import CardFeed from '../CardFeed'
import TopStories from '../../TopStories'
import '../cards.css'
import './dispatch.css'

// The Dispatch stream's own page, modelled on The Tape: same masthead, same
// front-page package, same paged card grid — blue where that one is red. The
// two streams should read as siblings, so anything that differs here differs
// because the content does, not because it was built separately.
//
// What differs, and why:
//   - no status filter or badge. A dispatch has nothing to sell; its category
//     is the whole kicker.
//   - the card's third line is the deck rather than an address and unit count.
//   - the masthead's meta row counts entries and states the cadence, where the
//     Tape's counts sold and for sale.
//
// Still open: this borrows the Tape's skyline photo at a different crop. It
// wants its own image — see the note in dispatch.css.

// Carol M. Highsmith, Library of Congress — public domain, no attribution
// required. The same asset the Tape masthead uses.
const HERO_IMAGE = '/images/la-skyline-dusk.jpg'

const DEK =
  'Market essays, construction cost reads and policy notes — written from the ' +
  'field by an owner-operator, not a brokerage desk.'

export const metadata: Metadata = pageMetadata({
  title: 'Dispatch · Atlas Brief',
  description:
    'Every Atlas Brief dispatch — market essays, construction cost reads and policy notes from a Los Angeles owner-operator.',
  path: '/atlas-brief/dispatch',
})

export default async function DispatchPage() {
  const all = await getArticles()
  const posts: ArticleCard[] = all.filter(a => a.kind === 'post')

  // The package, built exactly as the Tape's is: newest entry large, the rest
  // of the week stacked beside it, everything older in the grid below. The
  // seven-day window means it re-forms on its own as David publishes; on a
  // quiet week it comes back empty and falls back to the five most recent,
  // saying so rather than claiming they're from this week.
  const WEEK_MS = 7 * 24 * 60 * 60 * 1000
  const [lead, ...afterLead] = posts
  const withinWeek = afterLead.filter(a => {
    if (!a.published_at) return false
    const t = new Date(a.published_at).getTime()
    return !Number.isNaN(t) && Date.now() - t <= WEEK_MS
  })
  const thisWeek = withinWeek.length > 0
  const stack = (thisWeek ? withinWeek : afterLead).slice(0, 5)
  const stackLabel = thisWeek ? 'Others This Week' : 'Most Recent'
  const stackSlugs = new Set(stack.map(a => a.slug))
  const rest = afterLead.filter(a => !stackSlugs.has(a.slug))

  return (
    <>
      {/* The photo rides on the band as a custom property, not on markup inside
          the capped wrap — in there it stops short of the band's edges. Same
          arrangement as the Tape masthead. */}
      <header
        className="dp-masthead"
        style={{ ['--dp-hero' as string]: `url(${HERO_IMAGE})` }}
      >
        <div className="dp-masthead-inner">
          <div className="dp-mark">
            <span className="dp-wordmark">Atlas <em>Brief</em></span>
          </div>
          <h1>
            Dis<em>patch</em>
          </h1>
          <p className="dp-dek">{DEK}</p>
          <div className="dp-meta">
            <span>{posts.length} Entries</span>
            <span>Every Friday</span>
          </div>
        </div>
      </header>

      {lead && (
        <TopStories
          lead={lead}
          stack={stack}
          mostRead={[]}
          leadLabel="Latest"
          stackLabel={stackLabel}
        />
      )}

      <section className="dp-feed">
        <div className="wrap">
          {/* Client-side because paging is a reader control; the first page is
              server-rendered either way. */}
          <CardFeed rows={rest} stream="dispatch" fallbackLabel="Dispatch" />
        </div>
      </section>

      <Footer />
    </>
  )
}
