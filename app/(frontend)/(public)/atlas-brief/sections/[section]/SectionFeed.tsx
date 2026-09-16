'use client'

import { useRef, useState } from 'react'
import Link from 'next/link'
import type { ArticleCard } from '@/lib/db/articles'
import { statusKicker } from '@/lib/db/article-render'
import { calmHeadline } from '@/lib/db/headline-case'

// The section's running feed, with an All / Sold / For Sale filter above it —
// the same object as the homepage's Tape/Dispatch tabs, under its own class
// names because home.css only loads on the homepage and its generic ones have
// leaked between routes before.
type Filter = 'all' | 'sold' | 'for_sale'

const MONTHS_AP = ['Jan.', 'Feb.', 'March', 'April', 'May', 'June', 'July', 'Aug.', 'Sept.', 'Oct.', 'Nov.', 'Dec.']

function apDate(s: string | null | undefined): string {
  if (!s) return ''
  const d = new Date(s)
  if (Number.isNaN(d.getTime())) return ''
  return `${MONTHS_AP[d.getUTCMonth()]} ${d.getUTCDate()}, ${d.getUTCFullYear()}`
}

// Status leads — this is a listings board, so "SOLD" is the first thing an
// operator scans for — then the neighbourhood.
function rowKicker(a: ArticleCard, fallback: string): string {
  const status = statusKicker(a.listing?.status)
  const p = a.listing?.property
  const place = p?.neighborhood ?? p?.city ?? a.cat_label ?? fallback
  return [status, place].filter(Boolean).join(' · ')
}

function ArchiveRow({ a, fallback }: { a: ArticleCard; fallback: string }) {
  return (
    <Link href={`/atlas-brief/${a.slug}`} className="arc-row">
      <div className="arc-text">
        <div className="arc-kicker">
          <span>{rowKicker(a, fallback)}</span>
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

export default function SectionFeed({
  rows,
  sectionLabel,
}: {
  rows: ArticleCard[]
  sectionLabel: string
}) {
  const [filter, setFilter] = useState<Filter>('all')
  const listRef = useRef<HTMLDivElement>(null)

  const sold = rows.filter(a => a.listing?.status === 'sold')
  const forSale = rows.filter(a => a.listing?.status === 'for_sale')
  const shown = filter === 'all' ? rows : filter === 'sold' ? sold : forSale

  // Switching tabs starts the new list from the top again.
  function pick(next: Filter) {
    setFilter(next)
    listRef.current?.scrollTo({ top: 0 })
  }

  const tabs: { key: Filter; label: string; count: number }[] = [
    { key: 'all', label: 'All', count: rows.length },
    { key: 'sold', label: 'Sold', count: sold.length },
    { key: 'for_sale', label: 'For Sale', count: forSale.length },
  ]

  return (
    <>
      <div className="sec-tabs" role="tablist" aria-label="Filter entries by status">
        {tabs.map(t => (
          <button
            key={t.key}
            type="button"
            role="tab"
            aria-selected={filter === t.key}
            className={`sec-tab${filter === t.key ? ' is-active' : ''}`}
            onClick={() => pick(t.key)}
          >
            {t.label}
            <span className="sec-count">{t.count}</span>
          </button>
        ))}
      </div>

      {shown.length === 0 ? (
        <p className="sec-empty">Nothing here yet.</p>
      ) : (
        <div className="arc-scroll-wrap">
          <div className="archive-list" ref={listRef} tabIndex={0} role="region" aria-label="Entries">
            {shown.map(a => <ArchiveRow key={a.id} a={a} fallback={sectionLabel} />)}
          </div>
        </div>
      )}
    </>
  )
}
