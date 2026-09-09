'use client'

import { useCallback, useEffect, useRef, useState } from 'react'
import Link from 'next/link'
import type { ArticleCard } from '@/lib/db/articles'
import { formatDateLong, placeLine } from '@/lib/db/article-render'

// The featured slot under the masthead. One position, two views — Latest and
// Trending — switched by the section label, which doubles as the tab bar.
//
// Trending is a native scroll-snap track rather than a swap-in-place carousel:
// the browser does the scrolling, so trackpad swipe, touch drag and momentum all
// work without any of it being reimplemented, and the arrows/dots just call
// scrollTo. The live index is read back off scroll position, which means manual
// swipes and programmatic moves stay in sync by construction.
//
// Auto-advance pauses while the pointer is over the slot or focus is inside it,
// and never starts under prefers-reduced-motion.
const ROTATE_MS = 6000

type Tab = 'latest' | 'trending'

function kickerFor(a: ArticleCard, trending: boolean) {
  if (a.kind === 'post') return (a.cat_label ?? 'Dispatch').toUpperCase()
  if (trending) return 'MOST READ'
  return a.tape_tier ? `TAPE ${a.tape_tier}` : 'TAPE 3'
}

// One featured article. Shared by both views so they can't drift apart.
function FeatureCard({ article, trending }: { article: ArticleCard; trending: boolean }) {
  const place = article.listing?.property ?? null
  const headline = (article.headline ?? '').replace(/\*/g, '')
  const isPost = article.kind === 'post'

  return (
    <article className="tt-rotator">
      <div className="tl-meta">
        <span className="tl-tier">{kickerFor(article, trending)}</span>
        <span className="tl-date">{formatDateLong(article.published_at)}</span>
      </div>
      <h2 className="tl-headline">
        <Link href={`/atlas-brief/${article.slug}`}>{headline}</Link>
      </h2>
      {!isPost && <div className="tl-place">{placeLine(place)}</div>}
      {article.heroUrl && (
        <Link
          href={`/atlas-brief/${article.slug}`}
          className="tl-thumb"
          aria-label={place?.street_address ?? article.slug}
        >
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={article.heroUrl} alt={place?.street_address ?? ''} width={860} height={484} loading="lazy" />
        </Link>
      )}
      <p className="tl-excerpt">{article.excerpt ?? article.deck}</p>
      <Link href={`/atlas-brief/${article.slug}`} className="tl-more">
        Read the brief
      </Link>
    </article>
  )
}

export default function FeatureSlot({
  lead,
  trending,
}: {
  lead: ArticleCard
  trending: ArticleCard[]
}) {
  const [tab, setTab] = useState<Tab>('latest')
  const [index, setIndex] = useState(0)
  const [paused, setPaused] = useState(false)
  const [mayRotate, setMayRotate] = useState(false)
  const rootRef = useRef<HTMLDivElement>(null)
  const trackRef = useRef<HTMLDivElement>(null)

  const hasTrending = trending.length >= 2
  const onTrending = tab === 'trending' && hasTrending

  useEffect(() => {
    const mq = window.matchMedia('(prefers-reduced-motion: reduce)')
    const apply = () => setMayRotate(!mq.matches)
    apply()
    mq.addEventListener('change', apply)
    return () => mq.removeEventListener('change', apply)
  }, [])

  const scrollTo = useCallback((i: number) => {
    const el = trackRef.current
    if (!el) return
    el.scrollTo({ left: i * el.clientWidth, behavior: 'smooth' })
  }, [])

  // Read the index back off scroll position so a manual swipe updates the dots.
  function onScroll() {
    const el = trackRef.current
    if (!el || el.clientWidth === 0) return
    const i = Math.round(el.scrollLeft / el.clientWidth)
    setIndex(prev => (prev === i ? prev : Math.min(Math.max(i, 0), trending.length - 1)))
  }

  // `index` is a dep so a manual step restarts the clock — otherwise an
  // auto-advance can land a fraction of a second after a click.
  useEffect(() => {
    if (!onTrending || !mayRotate || paused || trending.length < 2) return
    const t = setTimeout(() => scrollTo((index + 1) % trending.length), ROTATE_MS)
    return () => clearTimeout(t)
  }, [onTrending, mayRotate, paused, trending.length, index, scrollTo])

  function pick(next: Tab) {
    setTab(next)
    setIndex(0)
    // The track only exists on the trending tab, so jump it after it mounts.
    if (next === 'trending') {
      requestAnimationFrame(() => trackRef.current?.scrollTo({ left: 0, behavior: 'auto' }))
    }
  }

  // Modulo of a negative stays negative in JS, so add the length before wrapping.
  const step = (delta: number) => scrollTo((index + delta + trending.length) % trending.length)

  return (
    <section
      className={`tape-lead${onTrending ? ' tape-trending' : ''}`}
      onMouseEnter={() => setPaused(true)}
      onMouseLeave={() => setPaused(false)}
      onFocusCapture={() => setPaused(true)}
      onBlurCapture={e => {
        if (!rootRef.current?.contains(e.relatedTarget as Node | null)) setPaused(false)
      }}
    >
      <div className="wrap">
        <div className="tl-inner" ref={rootRef}>
          {/* The section label is the tab bar — same rules-either-side treatment,
              now with two switchable labels between them. */}
          <div className="tl-slug" role="tablist" aria-label="Featured articles">
            <button
              type="button"
              role="tab"
              aria-selected={!onTrending}
              className={`tl-slug-tab${!onTrending ? ' is-active' : ''}`}
              onClick={() => pick('latest')}
            >
              Latest
            </button>
            {hasTrending && (
              <>
                <span className="tl-slug-sep" aria-hidden="true">/</span>
                <button
                  type="button"
                  role="tab"
                  aria-selected={onTrending}
                  className={`tl-slug-tab${onTrending ? ' is-active' : ''}`}
                  onClick={() => pick('trending')}
                >
                  Trending
                </button>
              </>
            )}
          </div>

          {onTrending ? (
            <>
              <button
                type="button"
                className="tr-arrow tr-arrow-prev"
                aria-label="Previous trending article"
                onClick={() => step(-1)}
              >
                <svg viewBox="0 0 24 24" width="22" height="22" aria-hidden="true">
                  <path d="M15 4 7 12l8 8" fill="none" stroke="currentColor" strokeWidth="2.2"
                        strokeLinecap="round" strokeLinejoin="round" />
                </svg>
              </button>
              <button
                type="button"
                className="tr-arrow tr-arrow-next"
                aria-label="Next trending article"
                onClick={() => step(1)}
              >
                <svg viewBox="0 0 24 24" width="22" height="22" aria-hidden="true">
                  <path d="M9 4l8 8-8 8" fill="none" stroke="currentColor" strokeWidth="2.2"
                        strokeLinecap="round" strokeLinejoin="round" />
                </svg>
              </button>

              <div
                className="tr-track"
                ref={trackRef}
                onScroll={onScroll}
                role="group"
                aria-roledescription="carousel"
                aria-label="Trending articles"
              >
                {trending.map((a, i) => (
                  <div
                    className="tr-slide"
                    key={a.id}
                    aria-roledescription="slide"
                    aria-label={`${i + 1} of ${trending.length}`}
                    // Off-screen slides are hidden from the reader, so the live
                    // region announces one article rather than all six.
                    aria-hidden={i !== index}
                  >
                    <FeatureCard article={a} trending />
                  </div>
                ))}
              </div>

              <div className="tr-dots">
                {trending.map((a, i) => (
                  <button
                    key={a.id}
                    type="button"
                    aria-label={`Article ${i + 1} of ${trending.length}`}
                    aria-current={i === index}
                    className={`tr-dot${i === index ? ' is-active' : ''}`}
                    onClick={() => scrollTo(i)}
                  />
                ))}
              </div>
            </>
          ) : (
            <FeatureCard article={lead} trending={false} />
          )}
        </div>
      </div>
    </section>
  )
}
