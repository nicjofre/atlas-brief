import { notFound } from 'next/navigation'
import Link from 'next/link'
import type { Metadata } from 'next'
import { pageMetadata } from '@/lib/seo/metadata'
import Footer from '../../../Footer'
import ArticleSubscribeModal from '../../../ArticleSubscribeModal'
import { createClient } from '@/lib/supabase/server'
import { getArticles } from '@/lib/db/articles'
import { getMostRead } from '@/lib/db/trending'
import { calmHeadline } from '@/lib/db/headline-case'
import WeekCarousel, { type WeekCard } from './WeekCarousel'
import CardFeed from '../../CardFeed'
import TopStories from '../../../TopStories'
import { sectionLabel } from '@/lib/db/article-render'
import { hand } from '../../../hand-font'
import '../../feed.css'
import '../../cards.css'
import './section.css'

// For now the only section we know about is broker-activity. When new sections
// land, add them to this registry (and to the sectionLabel map in article-render).
//
// Exported because app/sitemap.ts needs to know which section pages actually
// exist. It used to derive them from every section_slug in the feed, which
// advertised /atlas-brief/sections/the-tape — a 404, because bridged Payload
// posts are stamped with that slug and no page answers to it.
export const SECTION_REGISTRY: Record<string, {
  name: string
  emName: string
  eyebrow: string
  deck: string
  heroImage: string
}> = {
  'broker-activity': {
    // The masthead carries the stream's name, not the slug's. The label
    // followed on 2026-09-22 — sectionLabel() returns "The Tape" now, so the
    // breadcrumbs, the JSON-LD and the CMS editor agree with this masthead.
    // The slug itself stays `broker-activity`: it's in every published URL.
    name: 'The',
    emName: 'Tape',
    eyebrow: 'Atlas Brief',
    deck:
      "A running listings board for LA multifamily: what's for sale, what just sold, and what an operator thinks of the number.",
    // Carol M. Highsmith, Library of Congress — public domain, no attribution
    // required. Replaces the olympic-towers placeholder the sheet's LA skyline
    // was standing in for.
    heroImage: '/images/la-skyline-dusk.jpg',
  },
}

export async function generateStaticParams() {
  return Object.keys(SECTION_REGISTRY).map(section => ({ section }))
}

export async function generateMetadata(
  { params }: { params: Promise<{ section: string }> }
): Promise<Metadata> {
  const { section: slug } = await params
  const section = SECTION_REGISTRY[slug]
  if (!section) return { title: 'Atlas Brief' }
  return pageMetadata({
    title: `${section.name} ${section.emName} · Atlas Brief`,
    description: section.deck,
    path: `/atlas-brief/sections/${slug}`,
  })
}

// PARKED: the seven-day test "Others this week" used, before it became the five
// most recent. Module-level so the clock is read outside the component body
// (react-hooks/purity).
//   function publishedWithinDays(s: string | null | undefined, days: number): boolean {
//     if (!s) return false
//     const t = new Date(s).getTime()
//     return !Number.isNaN(t) && Date.now() - t <= days * 24 * 60 * 60 * 1000
//   }
const MONTHS_AP = ['Jan.', 'Feb.', 'March', 'April', 'May', 'June', 'July', 'Aug.', 'Sept.', 'Oct.', 'Nov.', 'Dec.']
function apDate(s: string | null | undefined): string {
  if (!s) return ''
  const d = new Date(s)
  return Number.isNaN(d.getTime()) ? '' : `${MONTHS_AP[d.getUTCMonth()]} ${d.getUTCDate()}`
}

export default async function SectionPage(
  { params }: { params: Promise<{ section: string }> }
) {
  const { section: slug } = await params
  const section = SECTION_REGISTRY[slug]
  if (!section) notFound()

  // One auth check so the pop-up never fires at signed-in staff.
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  const [list, everything] = await Promise.all([
    getArticles({ sectionSlug: slug }),
    getArticles(),
  ])
  // 2026-11-19 (Lucas): David's two latest essays in a cream panel under the
  // lead, linking across to Owner's Notes (leadFooter below).
  const notes = everything.filter(a => a.kind === 'post').slice(0, 2)

  // The section opens with the front-page package: newest entry large, the rest
  // of the week stacked beside it, everything older in the feed below. No Most
  // Read rail — this reads as a running news feed, not a front page, and
  // TopStories widens the two columns to fill when the rail is empty.
  //
  // The stack is a real seven-day window rather than "the next four", so the
  // package re-forms on its own as David publishes: a new entry becomes the
  // lead, yesterday's lead drops into the stack, and anything that ages out of
  // the week falls into the feed. On a quiet week the window can come back
  // empty, so it falls back to the five most recent and says so instead of
  // claiming they're from this week.
  //
  // 2026-11-04: the stack is now "Interesting deals", the three most-read Tape
  // entries over the last 30 days (Lucas's pick), instead of the rest of the
  // week. If view data is thin it tops up with the newest entries. The feed
  // below keeps every entry after the lead in date order, so a pick can also
  // appear there; that beats leaving a hole in the chronology.
  //
  // BACKUP — the seven-day stack this replaced. Delete only after Lucas confirms.
  //   const WEEK_MS = 7 * 24 * 60 * 60 * 1000
  //   const withinWeek = afterLead.filter(a => {
  //     if (!a.published_at) return false
  //     const t = new Date(a.published_at).getTime()
  //     return !Number.isNaN(t) && Date.now() - t <= WEEK_MS
  //   })
  //   const thisWeek = withinWeek.length > 0
  //   const stack = (thisWeek ? withinWeek : afterLead).slice(0, 5)
  //   const stackLabel = thisWeek ? 'Others This Week' : 'Most Recent'
  //   const stackSlugs = new Set(stack.map(a => a.slug))
  //   const rest = afterLead.filter(a => !stackSlugs.has(a.slug))
  const [lead, ...afterLead] = list
  const bySlug = new Map(afterLead.map(a => [a.slug, a]))
  const mostRead = await getMostRead(30, 60)
  const picks = mostRead
    .map(r => bySlug.get(r.slug))
    .filter((a): a is NonNullable<typeof a> => !!a)
    // Three picks again (Lucas, 2026-11-19), to fill the right column now the
    // left has the Owner's Notes panel. It was cut to two on 2026-11-04.
    .slice(0, 3)
  for (const a of afterLead) {
    if (picks.length >= 3) break
    if (!picks.includes(a)) picks.push(a)
  }
  const stack = picks
  // TRIAL 2026-11-18 (Lucas): named for what it is. Was 'Interesting deals'.
  const stackLabel = 'Most read deals'

  // "Recent deals" under the picks, one card at a time (WeekCarousel): the
  // five newest entries that aren't the lead or a pick (Lucas, 2026-11-04).
  // It was "Others this week", a seven-day window, but a quiet week left one
  // card and nothing to rotate. The seven-day test is parked above the component.
  const notPicked = afterLead.filter(a => !picks.includes(a))
  const recent = notPicked.slice(0, 5)

  // The archive leaves out everything the top section shows (lead, picks,
  // recent), so each deal appears once on the page (Lucas, 2026-11-04). It
  // opens where the top section leaves off. A pick that drops out of the top
  // two returns to its place in the archive on its own.
  const shownAbove = new Set([...picks, ...recent].map(a => a.slug))
  const rest = afterLead.filter(a => !shownAbove.has(a.slug))

  const weekCards: WeekCard[] = recent.map(a => ({
    slug: a.slug,
    headline: calmHeadline(a.headline),
    heroUrl: a.heroUrl,
    place: a.listing?.property?.neighborhood ?? a.listing?.property?.city ?? 'The Tape',
    date: apDate(a.published_at),
  }))
  const weekLabel = 'Recent deals'

  return (
    <>
      {/* The photo rides on the band itself as a custom property, not on the
          markup inside the capped wrap — positioned in there it kept stopping
          short of the band's right edge. */}
      <header
        className="cat-masthead"
        style={{ ['--cat-hero' as string]: `url(${section.heroImage})` }}
      >
        <div className="cat-masthead-inner">
          <div>
            {/* The wordmark above the title, where the tracked "ATLAS BRIEF"
                eyebrow used to sit. Words only — the roundel came out on
                2026-09-21: at wordmark size it read as a badge stuck on the
                front rather than part of the line. It's still one <AtlasMark />
                away if that changes.
                `eyebrow` stays on the registry entry: the (hidden) photo
                caption still reads it, and it's the string to fall back to. */}
            {/* PARKED (2026-11-04): the small wordmark above the title. The nav
                already carries the name, and Nic's front page shows it once.
                <div className="cat-mark">
                  <span className="cat-wordmark">Atlas <em>Brief</em></span>
                </div>
                The title was `{section.name} <em>{section.emName}</em>`, a serif
                lockup with a red rule. It's in the front page's hand now: the
                same Caveat heading and drawn red line as "The Tape" there. */}
            {/* Bold Times like the logo (2026-11-04, Lucas's pick). It was in
                the front page's hand: className={`cat-hand ${hand.className}`}
                style={{ fontFamily: hand.style.fontFamily }}, with
                `import { hand } from '../../../hand-font'` at the top. */}
            <h1 className="cat-hand">
              {/* "Tape" in red, the way the logo sets "Brief". */}
              <span>{section.name} <em>{section.emName}</em></span>
              {/* PARKED (2026-11-04, Lucas: "get rid of that red line"): the
                  drawn red line out to the page edge, from the front page.
                  <svg viewBox="0 0 400 12" preserveAspectRatio="none" aria-hidden="true">
                    <path d="M3 6 C 80 10, 160 3, 240 7 S 350 4, 397 6" />
                  </svg> */}
            </h1>
            {/* The deck and the sold/for-sale row came out on 2026-09-22,
                following Dispatch. Both were explaining the section to someone
                already in it, which is the thing a paper never does — a flag
                carries the place and the date, and the entries say the rest.
                `deck` stays on the registry entry: it's the page's meta
                description, which still wants a sentence. */}
            {/* Dateline removed 2026-11-19 (Lucas: redundant, every post carries
                its own date), as on Owner's Notes. It was:
                <p className="cat-dateline">
                  <span>Los Angeles</span>
                  <time dateTime={…}>{dateline()}</time>
                </p>
                dateline() went with it; it's in git at 0d02317. */}
            {/* What the Tape is, in the space right of the title (2026-11-04,
                Lucas's ask). Same sentence as the meta description, so the
                two can't drift apart. */}
            {/* One line (2026-11-19, Lucas). It was broken before its last
                clause with:
                  const i = section.deck.lastIndexOf(', and ')
                  <>{section.deck.slice(0, i + 1)}<br />{section.deck.slice(i + 2)}</> */}
            <p className="cat-about">{section.deck}</p>
          </div>
          <div className="cat-hero-img">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={section.heroImage} alt={`${section.name} ${section.emName}`} />
            <div className="cat-img-caption">{section.eyebrow}</div>
          </div>
        </div>
      </header>

      {/* .cat-package lets section.css restyle TopStories' labels on this page
          only; the front page and Owner's Notes keep Nic's styles. */}
      {lead && (
        <div className="cat-package">
          <TopStories
            lead={lead}
            stack={stack}
            mostRead={[]}
            // The front page's handwritten "Latest" (FrontTop.tsx): the word
            // in Caveat, then a red line drawn out to the column's edge.
            // Was leadLabel="Latest".
            // TRIAL 2026-11-18 (Lucas): the word "Latest" off the page, the red
            // line alone across the full column. "Latest" stays for screen
            // readers only. To bring the word back, restore:
            //   <span className={`cat-hand-label ${hand.className}`}>Latest</span>
            leadLabel={
              <>
                <span style={{ position: 'absolute', width: 1, height: 1, overflow: 'hidden', clip: 'rect(0 0 0 0)', whiteSpace: 'nowrap' }}>Latest</span>
                {/* Runs edge to edge, the photo's width (was M3 … 397, a few
                    px short at each end). */}
                <svg className="cat-hand-line" viewBox="0 0 400 12" preserveAspectRatio="none" aria-hidden="true">
                  <path d="M0 7 C 70 3, 140 10, 210 6 S 340 3, 400 7" />
                </svg>
              </>
            }
            // Same hand and line as "Latest", so the two columns match.
            stackLabel={
              <>
                <span className={`cat-hand-label ${hand.className}`}>{stackLabel}</span>
                <svg className="cat-hand-line" viewBox="0 0 400 12" preserveAspectRatio="none" aria-hidden="true">
                  <path d="M3 6 C 80 10, 160 3, 240 7 S 350 4, 397 6" />
                </svg>
              </>
            }
            leadFooter={notes.length > 0 && (
              <aside className="cat-notes" aria-label="From Owner's Notes">
                {/* Copy from Lucas, 2026-11-19. Was "From Owner's Notes". */}
                <h3 className="cat-notes-hed">Enjoying our point of view?</h3>
                <p className="cat-notes-dek">
                  Check out <Link href="/atlas-brief/dispatch">Owner&rsquo;s Notes</Link> for
                  the perspective of an owner in LA.
                </p>
                <ol className="cat-notes-list">
                  {notes.map(a => (
                    <li key={a.id}>
                      <time dateTime={a.published_at ?? undefined}>{apDate(a.published_at)}</time>
                      <Link href={`/atlas-brief/${a.slug}`}>{calmHeadline(a.headline)}</Link>
                    </li>
                  ))}
                </ol>
                {/* "Read all of David's essays" removed 2026-11-19 (Lucas): the
                    line under the heading already links to Owner's Notes. */}
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

      <section
        className="archive-feed"
        style={{
          // The 1px ink rules above and below came out on 2026-11-04, as Nic
          // took the rules off the front page: the spacing separates it.
          padding: 'clamp(36px, 4.5vw, 64px) 0 clamp(56px, 7vw, 96px)',
        }}
      >
        <div className="wrap">
          {/* No head here any more: the tabs below name the list and carry the
              counts, and "Every entry, newest first" stopped being true the
              moment a status filter was applied. */}
          {/* "Our archive" heading (2026-11-04), in the hand of the
              package's heads but without a line. It replaces the "Page 1 of
              5" bar, which section.css hides on this page. */}
          <h2 className={`cat-archive-hed ${hand.className}`}>
            {/* "Archive" (2026-11-18, Lucas); was "Our archive". */}
            <span>Archive</span>
            {/* The red line, as after "Latest": the two main sections of the
                page each open with one (Lucas, 2026-11-04). */}
            <svg className="cat-hand-line" viewBox="0 0 400 12" preserveAspectRatio="none" aria-hidden="true">
              {/* Out to the cards' right edge (2026-11-18; was M3 … 397,
                  a few px short). */}
              <path d="M3 6 C 90 9, 180 3, 270 7 S 360 5, 400 6" />
            </svg>
          </h2>
          {/* Client-side because paging is a reader control; the first page
              is server-rendered either way. */}
          <CardFeed rows={rest} stream="tape" fallbackLabel={sectionLabel(slug)} pageSize={13} />
        </div>
      </section>

      {/* The signup pop-up, as on the front page. A stream archive is a
          browsing page like the homepage — no .art-body, so the trigger falls
          back to whole-page depth, and on a card grid that is the only
          engagement there is to measure. Someone paging through the deals board is
          plainly interested.

          Behind an auth check: David and Lucas are not the audience. */}
      {!user && <ArticleSubscribeModal enabled slug="the-tape" />}

      <Footer />
    </>
  )
}

