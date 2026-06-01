import Link from 'next/link'
import type { Metadata } from 'next'
import Footer from './Footer'
import DispatchForm from './DispatchForm'
import { getArticles } from '@/lib/db/articles'
import { formatDateLong, placeLine, statusBadgeKey, statusKicker } from '@/lib/db/article-render'
import './home.css'

export const metadata: Metadata = {
  title: 'The Tape · Atlas Home Pro',
  description:
    "A running log of Los Angeles real estate — what trades, what's listed, what the numbers actually say. By David Safai.",
}

export default async function HomePage() {
  const articles = await getArticles()

  return (
    <>
      <header className="flag">
        <div className="flag-inner">
          <div className="flag-left">
            <b>Editor &amp; Publisher</b><br />
            David Safai<br />
            Los Angeles, Cal.
          </div>
          <h1 className="flag-title">Atlas <em>Brief</em></h1>
          <div className="flag-right">
            <b>A Journal of Record</b><br />
            Real Estate · Development<br />
            Construction · Policy
          </div>
        </div>
        <div className="flag-rule">
          <hr />
          <span>Est. MCMXCVI</span>
          <hr />
          <span className="dot" />
          <hr />
        </div>
      </header>

      <section className="tape-masthead">
        <div className="wrap">
          <p className="tm-deck">
            A running log of Los Angeles real estate &mdash; what trades, what&apos;s listed, what the
            numbers actually say. Written by David Safai, operator · developer · GC.
          </p>
          <DispatchForm />
        </div>
      </section>

      <section className="tape-feed">
        <div className="wrap">
          {articles.map(a => {
            const p = a.listing?.property ?? null
            const tier = a.tape_tier ? `TAPE ${a.tape_tier}` : 'TAPE 3'
            // Strip the *italic* markers — homepage tape headlines render plain.
            const headlinePlain = (a.headline ?? '').replace(/\*/g, '')
            return (
              <article key={a.id} className="tape-entry">
                <div className="te-body">
                  <div className="te-meta">
                    <span className="te-tier">{tier}</span>
                    <span className="te-date">{formatDateLong(a.published_at)}</span>
                  </div>
                  <h2 className="te-headline">
                    <Link href={`/atlas-brief/${a.slug}`}>{headlinePlain}</Link>
                  </h2>
                  <div className="te-place">{placeLine(p)}</div>
                  <p className="te-excerpt">{a.excerpt ?? a.deck}</p>
                  <div className="te-foot">
                    <span>{a.cat_label ?? 'Broker Activity'}</span>
                    <span className={`badge badge-${statusBadgeKey(a.listing?.status)}`}>
                      {statusKicker(a.listing?.status)}
                    </span>
                  </div>
                </div>
                <Link
                  href={`/atlas-brief/${a.slug}`}
                  className="te-thumb"
                  aria-label={p?.street_address ?? a.slug}
                >
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src={a.heroUrl ?? ''}
                    alt={p?.street_address ?? ''}
                    loading="lazy"
                    width={220}
                    height={165}
                  />
                </Link>
              </article>
            )
          })}
        </div>
      </section>

      <Footer />
    </>
  )
}
