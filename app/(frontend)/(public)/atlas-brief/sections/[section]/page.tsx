import { notFound } from 'next/navigation'
import type { Metadata } from 'next'
import { pageMetadata } from '@/lib/seo/metadata'
import Footer from '../../../Footer'
import { getArticles } from '@/lib/db/articles'
import CardFeed from '../../CardFeed'
import TopStories from '../../../TopStories'
import { sectionLabel } from '@/lib/db/article-render'
import '../../feed.css'
import '../../cards.css'
import './section.css'

// For now the only section we know about is broker-activity. When new sections
// land, add them to this registry (and to the sectionLabel map in article-render).
const SECTION_REGISTRY: Record<string, {
  name: string
  emName: string
  eyebrow: string
  deck: string
  heroImage: string
}> = {
  'broker-activity': {
    // The masthead carries the stream's name, not the slug's. "Broker Activity"
    // is still the section label on article pages and in the CMS — renaming
    // that reaches the editor and the kickers, so it's a separate job.
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

// A paper's flag carries a dateline, not a description of the section. Built
// per request rather than at module load so it can't freeze at build time —
// the route renders dynamically (getArticles reads cookies), so this is the
// date the reader is actually looking at.
function dateline(): string {
  return new Date().toLocaleDateString('en-US', {
    timeZone: 'America/Los_Angeles',
    weekday: 'long',
    month: 'long',
    day: 'numeric',
    year: 'numeric',
  })
}

export default async function SectionPage(
  { params }: { params: Promise<{ section: string }> }
) {
  const { section: slug } = await params
  const section = SECTION_REGISTRY[slug]
  if (!section) notFound()

  const list = await getArticles({ sectionSlug: slug })

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
  const WEEK_MS = 7 * 24 * 60 * 60 * 1000
  const [lead, ...afterLead] = list
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
            <div className="cat-mark">
              <span className="cat-wordmark">Atlas <em>Brief</em></span>
            </div>
            <h1>
              {section.name} <em>{section.emName}</em>
            </h1>
            {/* The deck and the sold/for-sale row came out on 2026-09-22,
                following Dispatch. Both were explaining the section to someone
                already in it, which is the thing a paper never does — a flag
                carries the place and the date, and the entries say the rest.
                `deck` stays on the registry entry: it's the page's meta
                description, which still wants a sentence. */}
            <p className="cat-dateline">
              <span>Los Angeles</span>
              <time dateTime={new Date().toISOString().slice(0, 10)}>{dateline()}</time>
            </p>
          </div>
          <div className="cat-hero-img">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={section.heroImage} alt={`${section.name} ${section.emName}`} />
            <div className="cat-img-caption">{section.eyebrow}</div>
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

      <section
        className="archive-feed"
        style={{
          padding: 'clamp(36px, 4.5vw, 64px) 0 clamp(56px, 7vw, 96px)',
          borderTop: '1px solid var(--ink)',
          borderBottom: '1px solid var(--ink)',
        }}
      >
        <div className="wrap">
          {/* No head here any more: the tabs below name the list and carry the
              counts, and "Every entry, newest first" stopped being true the
              moment a status filter was applied. */}
          {/* Client-side because paging is a reader control; the first page
              is server-rendered either way. */}
          <CardFeed rows={rest} stream="tape" fallbackLabel={sectionLabel(slug)} />
        </div>
      </section>

      <Footer />
    </>
  )
}

