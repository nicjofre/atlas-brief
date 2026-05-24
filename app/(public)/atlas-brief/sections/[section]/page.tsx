import Link from 'next/link'
import { notFound } from 'next/navigation'
import type { Metadata } from 'next'
import Footer from '../../../Footer'
import { getArticles, type ArticleCard } from '@/lib/db/articles'
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
    eyebrow: 'Atlas Brief · Section 07',
    deck:
      "A running listings board for LA multifamily: what's for sale, what just sold, and what an operator thinks of the number.",
    heroImage: '/images/brief/cat-broker-activity.jpg',
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
  return {
    title: `${section.name} ${section.emName} · Atlas Brief`,
    description: section.deck,
  }
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

  return (
    <>
      <header className="cat-masthead">
        <div className="cat-masthead-inner">
          <div>
            <div className="cat-eyebrow">{section.eyebrow}</div>
            <h1>
              {section.name}<br />
              <em>{section.emName}</em>
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
                  color: 'var(--accent)',
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
                borderBottom: '1px solid var(--accent)',
                paddingBottom: 1,
              }}
            >
              ← All sections
            </Link>
          </div>

          <div className="archive-list">
            {list.map((a, i) => <ArchiveRow key={a.id} a={a} pos={list.length - i} />)}
          </div>
        </div>
      </section>

      <Footer />
    </>
  )
}

function ArchiveRow({ a, pos }: { a: ArticleCard; pos: number }) {
  return (
    <Link href={`/atlas-brief/${a.slug}`} className="arc-row">
      <div className="arc-num">№ {String(pos).padStart(2, '0')}</div>
      <div className="arc-kicker">
        {statusKicker(a.listing?.status)}<br />
        {a.cat_label ?? sectionLabel(a.section_slug)}
      </div>
      <div>
        <h3 className="arc-title"><HeadlineText text={a.headline} /></h3>
        <p className="arc-deck">{a.excerpt ?? a.deck}</p>
      </div>
      <div className="arc-date">{formatDateLong(a.published_at)}</div>
    </Link>
  )
}
