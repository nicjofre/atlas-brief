import Link from 'next/link'
import type { Metadata } from 'next'
import Footer from '../Footer'
import { getArticles, type ArticleCard } from '@/lib/db/articles'
import {
  HeadlineText,
  cardMeta,
  formatDateLong,
  sectionLabel,
  statusBadgeKey,
  statusKicker,
} from '@/lib/db/article-render'
import './feed.css'

export const metadata: Metadata = {
  title: 'Atlas Brief · LA Real Estate, Construction, and Policy',
  description:
    'Atlas Brief: an operator-first read of LA real estate, construction costs, development, and policy. Written by David Safai.',
}

export default async function AtlasBriefIndex() {
  const articles = await getArticles()

  if (articles.length === 0) {
    return (
      <>
        <FeedMasthead />
        <section className="front">
          <div className="wrap" style={{ padding: '64px 0', color: 'var(--muted)' }}>
            No dispatches yet.
          </div>
        </section>
        <Footer />
      </>
    )
  }

  const lead = articles[0]
  const rail = articles.slice(1)

  return (
    <>
      <FeedMasthead />

      <div className="cat-bar">
        <div className="cat-bar-inner">
          <div className="count">{articles.length} live</div>
          <ul className="cat-list">
            <li><button className="active">All</button></li>
            <li><Link href="/atlas-brief/sections/broker-activity">Broker Activity</Link></li>
          </ul>
          <div className="sort">Sorted: <b>Newest</b></div>
        </div>
      </div>

      <section className="front">
        <div className="wrap">
          <div className="front-head">
            <div className="num">§ I, The Front Page</div>
            <h2 className="flag">Issue 001. April 2026.</h2>
            <div className="right">{articles.length} dispatches</div>
          </div>

          <div
            className="front-feed"
            style={{
              display: 'grid',
              gridTemplateColumns: '1.5fr 1fr',
              gap: 'clamp(32px, 5vw, 72px)',
              alignItems: 'start',
              marginTop: 'clamp(32px, 4vw, 56px)',
            }}
          >
            <LeadCard a={lead} />
            <div className="rail">
              <div className="rail-head">Also in this issue</div>
              {rail.map(a => <RailItem key={a.id} a={a} />)}
            </div>
          </div>
        </div>
      </section>

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
                § III, The Archive
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
                Every dispatch, newest first.
              </h2>
            </div>
            <div
              style={{
                fontFamily: 'var(--mono)',
                fontSize: 11,
                letterSpacing: '0.12em',
                textTransform: 'uppercase',
                color: 'var(--muted)',
              }}
            >
              {articles.length} entries · Issue 001
            </div>
          </div>

          <div className="archive-list">
            {articles.map((a, i) => <ArchiveRow key={a.id} a={a} pos={articles.length - i} />)}
          </div>
        </div>
      </section>

      <Footer />
    </>
  )
}

function FeedMasthead() {
  return (
    <header className="flag">
      <div
        style={{
          textAlign: 'center',
          fontFamily: 'var(--mono)',
          fontSize: 11,
          letterSpacing: '0.22em',
          textTransform: 'uppercase',
          color: 'var(--muted)',
          padding: 'clamp(20px, 3vw, 36px) clamp(20px, 4vw, 48px) clamp(14px, 2vw, 22px)',
        }}
      >
        Atlas Brief · A Journal of Record · Los Angeles
      </div>
      <h1
        className="flag-title"
        style={{ textAlign: 'center', padding: '0 clamp(20px, 4vw, 48px)' }}
      >
        Atlas <em>Brief</em>
      </h1>
      <div
        style={{
          textAlign: 'center',
          fontFamily: 'var(--serif)',
          fontStyle: 'italic',
          fontSize: 'clamp(14px, 1.4vw, 18px)',
          color: 'var(--ink-soft)',
          letterSpacing: '-0.005em',
          padding: 'clamp(12px, 1.5vw, 20px) clamp(20px, 4vw, 48px) clamp(20px, 3vw, 36px)',
        }}
      >
        Real Estate · Development · Construction · Policy · Est. MCMXCVI
      </div>
    </header>
  )
}

function LeadCard({ a }: { a: ArticleCard }) {
  const p = a.listing?.property ?? null
  const status = a.listing?.status
  const isPost = a.kind === 'post'
  return (
    <Link href={`/atlas-brief/${a.slug}`} className="lead-card">
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img src={a.heroUrl ?? ''} alt="" className="lead-img" />
      <div className="lead-kicker">
        {isPost ? (
          <span>{a.cat_label ?? 'Dispatch'}</span>
        ) : (
          <>
            <span className={`badge badge-${statusBadgeKey(status)}`}>{statusKicker(status)}</span>
            <span>
              {a.cat_label ?? sectionLabel(a.section_slug)} · Entry № {String(a.entry_num).padStart(2, '0')}
            </span>
          </>
        )}
      </div>
      <h3 className="lead-title"><HeadlineText text={a.headline} /></h3>
      <p className="lead-deck">{a.excerpt ?? a.deck}</p>
      <div className="lead-meta">
        <span><b>{formatDateLong(a.published_at)}</b></span>
        <span>{cardMeta(p)}</span>
      </div>
    </Link>
  )
}

function RailItem({ a }: { a: ArticleCard }) {
  const status = a.listing?.status
  const isPost = a.kind === 'post'
  return (
    <Link href={`/atlas-brief/${a.slug}`} className="rail-item">
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img src={a.heroUrl ?? ''} alt="" />
      <div>
        <div className="r-kicker">
          {isPost
            ? (a.cat_label ?? 'Dispatch')
            : `${statusKicker(status)} · ${a.cat_label ?? sectionLabel(a.section_slug)}`}
        </div>
        <h4 className="r-title"><HeadlineText text={a.headline} /></h4>
        <p className="r-deck">{a.excerpt ?? a.deck}</p>
      </div>
    </Link>
  )
}

function ArchiveRow({ a, pos }: { a: ArticleCard; pos: number }) {
  const status = a.listing?.status
  const isPost = a.kind === 'post'
  return (
    <Link href={`/atlas-brief/${a.slug}`} className="arc-row">
      <div className="arc-num">№ {String(pos).padStart(2, '0')}</div>
      <div className="arc-kicker">
        {isPost ? (
          a.cat_label ?? 'Dispatch'
        ) : (
          <>
            {statusKicker(status)}<br />
            {a.cat_label ?? sectionLabel(a.section_slug)}
          </>
        )}
      </div>
      <div>
        <h3 className="arc-title"><HeadlineText text={a.headline} /></h3>
        <p className="arc-deck">{a.excerpt ?? a.deck}</p>
      </div>
      <div className="arc-date">{formatDateLong(a.published_at)}</div>
    </Link>
  )
}
