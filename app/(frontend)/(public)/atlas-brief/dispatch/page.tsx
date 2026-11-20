import type { Metadata } from 'next'
import { pageMetadata } from '@/lib/seo/metadata'
import Footer from '../../Footer'
import ArticleSubscribeModal from '../../ArticleSubscribeModal'
import { createClient } from '@/lib/supabase/server'
import { getArticles, type ArticleCard } from '@/lib/db/articles'
import Link from 'next/link'
import { getMostRead } from '@/lib/db/trending'
import { calmHeadline } from '@/lib/db/headline-case'
import CardFeed from '../CardFeed'
import TopStories from '../../TopStories'
import WeekCarousel, { type WeekCard } from '../sections/[section]/WeekCarousel'
import { hand } from '../../hand-font'
import '../cards.css'
// The Tape's stylesheet, for its top section (.cat-package, .cat-notes, .wk)
// now copied here (2026-11-19). Loaded before dispatch.css so this page's
// blue overrides win.
import '../sections/[section]/section.css'
import './dispatch.css'

// "Oct. 29", as the Tape's top section prints dates.
const MONTHS_AP = ['Jan.', 'Feb.', 'March', 'April', 'May', 'June', 'July', 'Aug.', 'Sept.', 'Oct.', 'Nov.', 'Dec.']
function apDate(s: string | null | undefined): string {
  if (!s) return ''
  const d = new Date(s)
  return Number.isNaN(d.getTime()) ? '' : `${MONTHS_AP[d.getUTCMonth()]} ${d.getUTCDate()}`
}

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

// The dateline() helper came out with the dateline on 2026-11-18 (essays
// don't need today's date). It's in git history at 2e60cdb if it's wanted back.

// What Owner's Notes is: shown beside the title and used in the meta
// description, so the two can't drift apart (the Tape does the same with its
// registry deck).
const ABOUT = 'David Safai’s essays on operating, building and the Los Angeles market.'

export const metadata: Metadata = pageMetadata({
  title: 'Owner’s Notes · Atlas Brief',
  description: `Owner’s Notes: ${ABOUT}`,
  path: '/atlas-brief/dispatch',
})

export default async function DispatchPage() {
  // One auth check so the pop-up never fires at signed-in staff.
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  const [all, tapeDeals, mostRead] = await Promise.all([
    getArticles(),
    getArticles({ sectionSlug: 'broker-activity' }),
    getMostRead(30, 60),
  ])
  const posts: ArticleCard[] = all.filter(a => a.kind === 'post')

  // The package, built exactly as the Tape's is: newest entry large, the rest
  // of the week stacked beside it, everything older in the grid below. The
  // seven-day window means it re-forms on its own as David publishes; on a
  // quiet week it comes back empty and falls back to the five most recent,
  // saying so rather than claiming they're from this week.
  const [lead, ...afterLead] = posts
  // 2026-11-18 (Lucas): always the nine most recent, as a dated headline list
  // beside the lead (dispatch.css). Tried the same day: six as a 2x3 photo
  // grid, with four more as a dated list under the lead (too busy). Was the
  // week's posts, else the five most recent:
  //   const WEEK_MS = 7 * 24 * 60 * 60 * 1000
  //   const withinWeek = afterLead.filter(a => {
  //     if (!a.published_at) return false
  //     const t = new Date(a.published_at).getTime()
  //     return !Number.isNaN(t) && Date.now() - t <= WEEK_MS
  //   })
  //   const thisWeek = withinWeek.length > 0
  //   const stack = (thisWeek ? withinWeek : afterLead).slice(0, 5)
  //   const stackLabel = thisWeek ? 'Others This Week' : 'Most Recent'
  // Dropping the week window also clears the Date.now-in-render lint error.
  //
  // 2026-11-19 feedback round (Nic: Owner's Notes and the Tape should be the
  // same): the top section is now built exactly as the Tape's is
  // (sections/[section]/page.tsx). The nine-item "Most recent" list it replaces:
  //   const stack = afterLead.slice(0, 9)
  //   const stackLabel = 'Most recent'
  //   const stackSlugs = new Set(stack.map(a => a.slug))
  //   const rest = afterLead.filter(a => !stackSlugs.has(a.slug))
  // Most read: the three most-read essays over 30 days, topped up with the
  // newest if view data is thin.
  const bySlug = new Map(afterLead.map(a => [a.slug, a]))
  const picks = mostRead
    .map(r => bySlug.get(r.slug))
    .filter((a): a is NonNullable<typeof a> => !!a)
    .slice(0, 3)
  for (const a of afterLead) {
    if (picks.length >= 3) break
    if (!picks.includes(a)) picks.push(a)
  }
  const stack = picks
  const stackLabel = 'Most read essays'
  // Recent essays: the five newest that aren't the lead or a pick, one card at
  // a time (WeekCarousel, the Tape's).
  const recent = afterLead.filter(a => !picks.includes(a)).slice(0, 5)
  const weekCards: WeekCard[] = recent.map(a => ({
    slug: a.slug,
    headline: calmHeadline(a.headline),
    heroUrl: a.heroUrl,
    place: a.cat_label ?? 'Owner’s Notes',
    date: apDate(a.published_at),
  }))
  const weekLabel = 'Recent essays'
  // The archive leaves out everything the top section shows.
  const shownAbove = new Set([...picks, ...recent].map(a => a.slug))
  const rest = afterLead.filter(a => !shownAbove.has(a.slug))
  // The panel under the lead links across to the Tape (Lucas, 2026-11-19),
  // with its two latest deals: the mirror of the Tape's Owner's Notes panel.
  const deals = tapeDeals.slice(0, 2)

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
          {/* 2026-11-07 — the Tape's header, in blue: bold Times title on the
              left, the description beside it, the dateline under. dispatch.css
              has the rules.
              BACKUP — the markup it replaced. Paste back to restore; delete
              only after Lucas confirms.
                <div className="dp-mark">
                  <span className="dp-wordmark">Atlas <em>Brief</em></span>
                </div>
                <h1>Owner&rsquo;s Notes</h1> */}
          {/* The <em> is a colour hook only (upright). "Notes" was blue, like
              the Tape's red "Tape"; Lucas made the whole title navy 2026-11-07,
              and the hook stays in case a colour comes back. */}
          <h1>Owner&rsquo;s <em>Notes</em></h1>
          <p className="dp-about">{ABOUT}</p>
          {/* The dek and the entry-count row came out on 2026-09-22. Both were
              explaining the section to someone who had already clicked into
              it, which is the thing a newspaper never does. A flag carries the
              place and the date; the stories say what the section is. */}
          {/* Dateline removed 2026-11-18 (Lucas: "this isn't really needed
              now"). To restore:
              <p className="dp-dateline">
                <span>Los Angeles</span>
                <time dateTime={new Date().toISOString().slice(0, 10)}>{dateline()}</time>
              </p> */}
        </div>
      </header>

      {/* TopStories is shared with the front page and the Tape, and its
          kickers are red there. Rather than give a component of Nic's a stream
          prop, the wrapper recolours them from dispatch.css — one selector,
          scoped to this page, nothing else touched. */}
      {/* 2026-11-19: the Tape's top section, markup and classes copied from
          sections/[section]/page.tsx, so section.css styles it the same.
          .dp-tape-format recolours it blue (dispatch.css). Was
          <div className="dp-package"> with leadLabel="Latest" and the
          nine-item "Most recent" list. */}
      {lead && (
        <div className="cat-package dp-tape-format">
          <TopStories
            lead={lead}
            stack={stack}
            mostRead={[]}
            leadLabel={
              <>
                <span style={{ position: 'absolute', width: 1, height: 1, overflow: 'hidden', clip: 'rect(0 0 0 0)', whiteSpace: 'nowrap' }}>Latest</span>
                <svg className="cat-hand-line" viewBox="0 0 400 12" preserveAspectRatio="none" aria-hidden="true">
                  <path d="M0 7 C 70 3, 140 10, 210 6 S 340 3, 400 7" />
                </svg>
              </>
            }
            stackLabel={
              <>
                <span className={`cat-hand-label ${hand.className}`}>{stackLabel}</span>
                <svg className="cat-hand-line" viewBox="0 0 400 12" preserveAspectRatio="none" aria-hidden="true">
                  <path d="M3 6 C 80 10, 160 3, 240 7 S 350 4, 397 6" />
                </svg>
              </>
            }
            leadFooter={deals.length > 0 && (
              <aside className="cat-notes" aria-label="From The Tape">
                <h3 className="cat-notes-hed">Enjoying our point of view?</h3>
                <p className="cat-notes-dek">
                  Check out <Link href="/atlas-brief/sections/broker-activity">The Tape</Link>{' '}
                  for what&rsquo;s trading in LA multifamily.
                </p>
                <ol className="cat-notes-list">
                  {deals.map(a => (
                    // No date (Lucas, 2026-11-19), as on the Tape's panel.
                    <li key={a.id}>
                      <Link href={`/atlas-brief/${a.slug}`}>{calmHeadline(a.headline)}</Link>
                    </li>
                  ))}
                </ol>
              </aside>
            )}
            stackFooter={
              <WeekCarousel
                items={weekCards}
                heading={
                  <>
                    <span className={`cat-hand-label ${hand.className}`}>{weekLabel}</span>
                    <svg className="cat-hand-line" viewBox="0 0 400 12" preserveAspectRatio="none" aria-hidden="true">
                      <path d="M3 7 C 90 3, 170 9, 250 5 S 350 8, 397 6" />
                    </svg>
                  </>
                }
              />
            }
          />
        </div>
      )}

      {/* 2026-11-19: the Tape's archive, markup copied from
          sections/[section]/page.tsx (section, heading, 13 a page in the mixed
          layout via tapeLayout), in blue (dispatch.css .dp-archive). No preview
          cards: essays open straight into the article.
          Was <section className="dp-feed"> with <h2 className="dp-archive-hed">
          and pageSize={14}: two big essays with six headlines beside each. */}
      <section
        className="archive-feed dp-archive"
        style={{ padding: 'clamp(36px, 4.5vw, 64px) 0 clamp(56px, 7vw, 96px)' }}
      >
        <div className="wrap">
          <h2 className={`cat-archive-hed ${hand.className}`}>
            <span>Archive</span>
            <svg className="cat-hand-line" viewBox="0 0 400 12" preserveAspectRatio="none" aria-hidden="true">
              <path d="M3 6 C 90 9, 180 3, 270 7 S 360 5, 400 6" />
            </svg>
          </h2>
          <CardFeed rows={rest} stream="dispatch" fallbackLabel="Owner’s Notes" pageSize={13} tapeLayout />
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
