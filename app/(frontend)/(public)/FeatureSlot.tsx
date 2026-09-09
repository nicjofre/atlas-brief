'use client'

import { useEffect, useRef, useState } from 'react'
import Link from 'next/link'
import type { ArticleCard } from '@/lib/db/articles'
import { formatDateLong, placeLine } from '@/lib/db/article-render'

// The featured slot under the masthead. One position, two views — Latest and
// Trending — switched by the section label, which doubles as the tab bar.
//
// Trending rotates; Latest is a single article and holds still. Rotation pauses
// while the pointer is over the slot or focus is inside it (so it can't yank a
// link out from under a click), and never starts under prefers-reduced-motion.
const ROTATE_MS = 6000

type Tab = 'latest' | 'trending'

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

  const hasTrending = trending.length >= 2
  const onTrending = tab === 'trending' && hasTrending

  useEffect(() => {
    const mq = window.matchMedia('(prefers-reduced-motion: reduce)')
    const apply = () => setMayRotate(!mq.matches)
    apply()
    mq.addEventListener('change', apply)
    return () => mq.removeEventListener('change', apply)
  }, [])

  useEffect(() => {
    if (!onTrending || !mayRotate || paused || trending.length < 2) return
    const t = setInterval(() => setIndex(i => (i + 1) % trending.length), ROTATE_MS)
    return () => clearInterval(t)
  }, [onTrending, mayRotate, paused, trending.length])

  const current = onTrending ? (trending[index] ?? trending[0]) : lead
  if (!current) return null

  const place = current.listing?.property ?? null
  const headline = (current.headline ?? '').replace(/\*/g, '')
  const isPost = current.kind === 'post'
  const kicker = isPost
    ? (current.cat_label ?? 'Dispatch').toUpperCase()
    : onTrending
      ? 'MOST READ'
      : current.tape_tier ? `TAPE ${current.tape_tier}` : 'TAPE 3'

  function pick(next: Tab) {
    setTab(next)
    setIndex(0)
  }

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

          {/* aria-live so a rotation is announced rather than changing silently. */}
          <article key={current.id} className="tt-rotator" role="tabpanel" aria-live="polite">
            <div className="tl-meta">
              <span className="tl-tier">{kicker}</span>
              <span className="tl-date">{formatDateLong(current.published_at)}</span>
            </div>
            <h2 className="tl-headline">
              <Link href={`/atlas-brief/${current.slug}`}>{headline}</Link>
            </h2>
            {!isPost && <div className="tl-place">{placeLine(place)}</div>}
            {current.heroUrl && (
              <Link
                href={`/atlas-brief/${current.slug}`}
                className="tl-thumb"
                aria-label={place?.street_address ?? current.slug}
              >
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={current.heroUrl} alt={place?.street_address ?? ''} width={860} height={484} />
              </Link>
            )}
            <p className="tl-excerpt">{current.excerpt ?? current.deck}</p>
            <Link href={`/atlas-brief/${current.slug}`} className="tl-more">
              Read the brief
            </Link>
          </article>

          {onTrending && trending.length > 1 && (
            <div className="tr-dots" aria-label="Trending articles">
              {trending.map((a, i) => (
                <button
                  key={a.id}
                  type="button"
                  aria-label={`Article ${i + 1} of ${trending.length}`}
                  aria-current={i === index}
                  className={`tr-dot${i === index ? ' is-active' : ''}`}
                  onClick={() => setIndex(i)}
                />
              ))}
            </div>
          )}
        </div>
      </div>
    </section>
  )
}
