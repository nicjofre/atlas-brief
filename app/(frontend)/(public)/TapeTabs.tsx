'use client'

import { useRef, useState } from 'react'
import Link from 'next/link'
import type { ArticleCard } from '@/lib/db/articles'
import { formatDateLong, placeLine, statusBadgeKey, statusKicker } from '@/lib/db/article-render'

// The tape feed with a Tape/Dispatch filter above it.
//
// `kind` is 'post' for freeform Payload dispatches and undefined/'brief' for
// listing-backed Tape entries, so "not a post" is the Tape test — matching how
// the cards themselves branch.
type Filter = 'all' | 'brief' | 'post'

const isPostEntry = (a: ArticleCard) => a.kind === 'post'

function tierLabel(a: ArticleCard) {
  if (isPostEntry(a)) return (a.cat_label ?? 'Dispatch').toUpperCase()
  return a.tape_tier ? `TAPE ${a.tape_tier}` : 'TAPE 3'
}

export default function TapeTabs({ articles }: { articles: ArticleCard[] }) {
  const [filter, setFilter] = useState<Filter>('all')
  const listRef = useRef<HTMLDivElement>(null)

  const tape = articles.filter(a => !isPostEntry(a))
  const dispatch = articles.filter(isPostEntry)
  const shown = filter === 'all' ? articles : filter === 'post' ? dispatch : tape

  // Switching tabs starts the new list from the top again.
  function pick(next: Filter) {
    setFilter(next)
    listRef.current?.scrollTo({ top: 0 })
  }

  const tabs: { key: Filter; label: string; count: number }[] = [
    { key: 'all', label: 'All', count: articles.length },
    { key: 'brief', label: 'The Tape', count: tape.length },
    { key: 'post', label: 'Dispatch', count: dispatch.length },
  ]

  return (
    <>
      <div className="tape-tabs" role="tablist" aria-label="Filter articles">
        {tabs.map(t => (
          <button
            key={t.key}
            type="button"
            role="tab"
            aria-selected={filter === t.key}
            className={`tt-tab${filter === t.key ? ' is-active' : ''}`}
            onClick={() => pick(t.key)}
          >
            {t.label}
            <span className="tt-count">{t.count}</span>
          </button>
        ))}
      </div>

      {shown.length === 0 ? (
        <p className="tt-empty">Nothing here yet.</p>
      ) : (
      <div className="tt-scroll-wrap">
        {/* Its own scroll pane, so the whole archive is reachable without the
            page running on for 100+ entries. tabIndex makes it keyboard
            scrollable, which an overflow container doesn't get for free. */}
        <div className="tt-scroll" ref={listRef} tabIndex={0} role="region" aria-label="Articles">
        {shown.map(a => {
          const p = a.listing?.property ?? null
          const isPost = isPostEntry(a)
          // Strip the *italic* markers — homepage tape headlines render plain.
          const headlinePlain = (a.headline ?? '').replace(/\*/g, '')
          return (
            <article key={a.id} className="tape-entry">
              <div className="te-body">
                <div className="te-meta">
                  <span className="te-tier">{tierLabel(a)}</span>
                  <span className="te-date">{formatDateLong(a.published_at)}</span>
                </div>
                <h2 className="te-headline">
                  <Link href={`/atlas-brief/${a.slug}`}>{headlinePlain}</Link>
                </h2>
                {!isPost && <div className="te-place">{placeLine(p)}</div>}
                <p className="te-excerpt">{a.excerpt ?? a.deck}</p>
                <div className="te-foot">
                  {isPost ? (
                    <span>Atlas Brief</span>
                  ) : (
                    <>
                      <span>{a.cat_label ?? 'Broker Activity'}</span>
                      <span className={`badge badge-${statusBadgeKey(a.listing?.status)}`}>
                        {statusKicker(a.listing?.status)}
                      </span>
                    </>
                  )}
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
      </div>
      )}
    </>
  )
}
