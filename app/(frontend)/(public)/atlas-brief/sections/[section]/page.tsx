import Link from 'next/link'
import { notFound } from 'next/navigation'
import type { Metadata } from 'next'
import { pageMetadata } from '@/lib/seo/metadata'
import Footer from '../../../Footer'
import { getArticles, type ArticleCard } from '@/lib/db/articles'
import { calmHeadline } from '@/lib/db/headline-case'
import TopStories from '../../../TopStories'
import {
  HeadlineText,
  formatDateLong,
  sectionLabel,
  statusKicker,
} from '@/lib/db/article-render'
import '../../feed.css'
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
    name: 'Broker',
    emName: 'Activity',
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

export default async function SectionPage(
  { params }: { params: Promise<{ section: string }> }
) {
  const { section: slug } = await params
  const section = SECTION_REGISTRY[slug]
  if (!section) notFound()

  const list = await getArticles({ sectionSlug: slug })
  const sold = list.filter(a => a.listing?.status === 'sold').length
  const forSale = list.filter(a => a.listing?.status === 'for_sale').length

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
            <div className="cat-eyebrow">{section.eyebrow}</div>
            <h1>
              {section.name} <em>{section.emName}</em>
            </h1>
            <p className="cat-dek">{section.deck}</p>
            <div className="cat-meta">
              <span>{sold} Sold</span>
              <span>{forSale} For Sale</span>
              <span>Updated Weekly</span>
            </div>
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
          padding: 'clamp(56px, 7vw, 96px) 0',
          borderTop: '1px solid var(--ink)',
          borderBottom: '1px solid var(--ink)',
        }}
      >
        <div className="wrap">
          <div
            className="front-head"
            style={{
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'baseline',
              paddingBottom: 24,
              borderBottom: '1px solid var(--ink)',
              marginBottom: 32,
              flexWrap: 'wrap',
              gap: 16,
            }}
          >
            <div>
              <div
                style={{
                  fontFamily: 'var(--mono)',
                  fontSize: 11,
                  letterSpacing: '0.14em',
                  textTransform: 'uppercase',
                  color: 'var(--brand-red)',
                  marginBottom: 6,
                }}
              >
                Dispatches
              </div>
              <h2
                style={{
                  fontFamily: 'var(--serif)',
                  fontWeight: 500,
                  fontSize: 'clamp(28px, 3.4vw, 44px)',
                  lineHeight: 1.05,
                  letterSpacing: '-0.02em',
                  margin: 0,
                }}
              >
                Every entry, newest first.
              </h2>
            </div>
            <Link
              href="/atlas-brief"
              style={{
                fontFamily: 'var(--mono)',
                fontSize: 11,
                letterSpacing: '0.12em',
                textTransform: 'uppercase',
                color: 'var(--muted)',
                borderBottom: '1px solid var(--brand-blue)',
                paddingBottom: 1,
              }}
            >
              ← All sections
            </Link>
          </div>

          {/* Scrolls in place, like the homepage's Tape/Dispatch list: 91 entries
              below the masthead is a very long page otherwise. The wrapper
              carries the fade at the foot of the pane. */}
          <div className="arc-scroll-wrap">
          <div className="archive-list" tabIndex={0} role="region" aria-label="Entries">
            {rest.map((a, i) => <ArchiveRow key={a.id} a={a} pos={rest.length - i} />)}
          </div>
          </div>
        </div>
      </section>

      <Footer />
    </>
  )
}

const MONTHS_AP = ['Jan.', 'Feb.', 'March', 'April', 'May', 'June', 'July', 'Aug.', 'Sept.', 'Oct.', 'Nov.', 'Dec.']

// AP-style date, the same stamp the front-page package uses.
function apDate(s: string | null | undefined): string {
  if (!s) return ''
  const d = new Date(s)
  if (Number.isNaN(d.getTime())) return ''
  return `${MONTHS_AP[d.getUTCMonth()]} ${d.getUTCDate()}, ${d.getUTCFullYear()}`
}

// Status leads — this is a listings board, so "SOLD" is the first thing an
// operator scans for — then the neighbourhood, the way Top Stories runs place
// before date.
function rowKicker(a: ArticleCard): string {
  const status = statusKicker(a.listing?.status)
  const p = a.listing?.property
  const place = p?.neighborhood ?? p?.city ?? a.cat_label ?? sectionLabel(a.section_slug)
  return [status, place].filter(Boolean).join(' · ')
}

// Rows in the front-page language: sans kicker in red, serif headline that
// underlines on hover, thumbnail on the right, hairline between entries.
function ArchiveRow({ a }: { a: ArticleCard; pos: number }) {
  return (
    <Link href={`/atlas-brief/${a.slug}`} className="arc-row">
      <div className="arc-text">
        <div className="arc-kicker">
          <span>{rowKicker(a)}</span>
          <time dateTime={a.published_at ?? undefined}>{apDate(a.published_at)}</time>
        </div>
        <h3 className="arc-title">{calmHeadline(a.headline)}</h3>
        {(a.excerpt ?? a.deck) && <p className="arc-deck">{a.excerpt ?? a.deck}</p>}
      </div>
      {a.heroUrl && (
        <div className="arc-thumb">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={a.heroUrl} alt="" width={200} height={134} loading="lazy" />
        </div>
      )}
    </Link>
  )
}
