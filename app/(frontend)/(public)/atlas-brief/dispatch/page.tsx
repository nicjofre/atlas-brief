import type { Metadata } from 'next'
import { pageMetadata } from '@/lib/seo/metadata'
import Footer from '../../Footer'
import ArticleSubscribeModal from '../../ArticleSubscribeModal'
import { createClient } from '@/lib/supabase/server'
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
//   - the masthead carries a dateline where the Tape still carries a dek and a
//     sold/for-sale count. That's the experiment running as of 2026-09-22, not
//     a settled difference: if the flag reads better here, the Tape follows.
//
// Carol M. Highsmith, Library of Congress — public domain, no attribution
// required. The same asset the Tape masthead uses.
const HERO_IMAGE = '/images/la-skyline-dusk.jpg'

// A paper's flag carries a dateline, not a description of the section. Built
// per request rather than at module load so it can't freeze at build time —
// the route renders dynamically (getArticles reads cookies), so this is the
// date the reader is actually looking at the page.
function dateline(): string {
  return new Date().toLocaleDateString('en-US', {
    timeZone: 'America/Los_Angeles',
    weekday: 'long',
    month: 'long',
    day: 'numeric',
    year: 'numeric',
  })
}

export const metadata: Metadata = pageMetadata({
  title: 'Dispatch · Atlas Brief',
  description:
    'Every Atlas Brief dispatch — market essays, construction cost reads and policy notes from a Los Angeles owner-operator.',
  path: '/atlas-brief/dispatch',
})

export default async function DispatchPage() {
  // One auth check so the pop-up never fires at signed-in staff.
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

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
          {/* One word, one face. "Dis/patch" split roman + italic was a
              branding device borrowed from the Atlas *Brief* lockup, where the
              italic half is a separate word — inside a single word it reads as
              a typo rather than a mark. */}
          <h1>Dispatch</h1>
          {/* The dek and the entry-count row came out on 2026-09-22. Both were
              explaining the section to someone who had already clicked into
              it, which is the thing a newspaper never does. A flag carries the
              place and the date; the stories say what the section is. */}
          <p className="dp-dateline">
            <span>Los Angeles</span>
            <time dateTime={new Date().toISOString().slice(0, 10)}>{dateline()}</time>
          </p>
        </div>
      </header>

      {/* TopStories is shared with the front page and the Tape, and its
          kickers are red there. Rather than give a component of Nic's a stream
          prop, the wrapper recolours them from dispatch.css — one selector,
          scoped to this page, nothing else touched. */}
      {lead && (
        <div className="dp-package">
          <TopStories
            lead={lead}
            stack={stack}
            mostRead={[]}
            leadLabel="Latest"
            stackLabel={stackLabel}
          />
        </div>
      )}

      <section className="dp-feed">
        <div className="wrap">
          {/* Client-side because paging is a reader control; the first page is
              server-rendered either way. */}
          <CardFeed rows={rest} stream="dispatch" fallbackLabel="Dispatch" />
        </div>
      </section>

      {/* The signup pop-up, as on the front page. A stream archive is a
          browsing page like the homepage — no .art-body, so the trigger falls
          back to whole-page depth, and on a card grid that is the only
          engagement there is to measure. Someone paging through the dispatch archive is
          plainly interested.

          Behind an auth check: David and Lucas are not the audience. */}
      {!user && <ArticleSubscribeModal enabled slug="dispatch" />}

      <Footer />
    </>
  )
}
