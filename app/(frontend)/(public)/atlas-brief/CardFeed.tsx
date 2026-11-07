'use client'

import { useEffect, useRef, useState } from 'react'
import Link from 'next/link'
import type { ArticleCard } from '@/lib/db/articles'
import { calmHeadline } from '@/lib/db/headline-case'
import ArchivePreview from './ArchivePreview'

// The paged card feed, shared by The Tape and Dispatch. Every entry as a card
// grid in the same language as the homepage's centre package — cards rather
// than rows because the front page is cards, and a stream page of list rows
// read as a different site.
//
// One component for both streams on purpose: they differ in accent colour and
// in whether a card carries listing chrome, which is two props, not two files.
// Styles live in ../cards.css, imported by each page.
//
// Two things the rows were doing that cards have to do differently:
//   - the old pane held the whole run in a fixed-height window, which hid the
//     length instead of handling it. Now it's fixed pages you turn.
//   - a row tolerated a missing photo; a card leaves a hole. Entries without a
//     hero get a tinted plate carrying the address, so the grid stays even.
//
// The Tape's All / Sold / For Sale tabs came out on 2026-09-21: the split was
// 83/3, so two of the three tabs were a tab to nothing much. Status still leads
// every card's kicker and still carries a badge, which is the part that was
// doing the work. The markup and its styles are parked (see section.css) if the
// mix ever evens out enough to be worth filtering.
//
// Load more became paging on 2026-09-21. A date range above the grid went with
// it and came straight back out: the backfill stamped 48 of the 93 entries with
// the same publish date, so half the pages read as one day and the span said
// nothing. The page indicator does the same job without claiming more.

// Six rows of four. Short enough that a page turn feels like a page, long
// enough that most of a quarter lands on one.
const PAGE_SIZE = 24

const MONTHS_AP = ['Jan.', 'Feb.', 'March', 'April', 'May', 'June', 'July', 'Aug.', 'Sept.', 'Oct.', 'Nov.', 'Dec.']

function apDate(s: string | null | undefined): string {
  if (!s) return ''
  const d = new Date(s)
  if (Number.isNaN(d.getTime())) return ''
  return `${MONTHS_AP[d.getUTCMonth()]} ${d.getUTCDate()}, ${d.getUTCFullYear()}`
}

// The Tape is a listings board, so "SOLD" leads and the neighbourhood follows.
// A dispatch has no listing behind it — its own category is the whole kicker.
function cardKicker(a: ArticleCard, stream: Stream, fallback: string): string {
  if (stream === 'dispatch') return a.cat_label ?? fallback
  // Place only (2026-11-04). It was "SOLD · Beverly Grove", but the badge under
  // the headline already says Sold, so the status printed twice per card. The
  // front page's cards show the neighbourhood alone (FrontTop.tsx).
  const p = a.listing?.property
  return p?.neighborhood ?? p?.city ?? a.cat_label ?? fallback
}

export type Stream = 'tape' | 'dispatch'

function FeedCard({ a, stream, fallback, onPreview }: {
  a: ArticleCard
  stream: Stream
  fallback: string
  // Tape only (2026-11-04): a plain click opens ArchivePreview instead of the
  // article. Modified and middle clicks fall through to the link as normal.
  onPreview?: (a: ArticleCard) => void
}) {
  const p = a.listing?.property ?? null
  const preview = onPreview
    ? (e: React.MouseEvent<HTMLAnchorElement>) => {
        if (e.button !== 0 || e.metaKey || e.ctrlKey || e.shiftKey || e.altKey) return
        e.preventDefault()
        onPreview(a)
      }
    : undefined
  // Listing chrome — the place line, the status badge — only means anything on
  // a brief. A dispatch gets its deck in that slot instead.
  const isTape = stream === 'tape'
  // The Tape's units/year/place line moved into the preview (2026-11-04) to
  // slim the archive cards; it was `isTape ? cardMeta(p) : ...`.
  const meta = isTape ? '' : (a.deck ?? a.excerpt ?? '')
  return (
    <article className="tpc-card">
      <Link href={`/atlas-brief/${a.slug}`} className="tpc-thumb" tabIndex={-1} aria-hidden="true" onClick={preview}>
        {a.heroUrl ? (
          // is-loaded starts the Tape's fade-in (cards.css). The ref catches a
          // photo that finished before this code ran, which fires no load event.
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={a.heroUrl}
            alt=""
            loading="lazy"
            width={420}
            height={236}
            ref={el => { if (el?.complete) el.classList.add('is-loaded') }}
            onLoad={e => e.currentTarget.classList.add('is-loaded')}
            onError={e => e.currentTarget.classList.add('is-loaded')}
          />
        ) : (
          // No photo on file. A plate with the address keeps the row even and
          // still says which building it is, which a grey box wouldn't.
          <span className="tpc-plate">
            <span>{(isTape ? p?.street_address : null) ?? a.cat_label ?? fallback}</span>
          </span>
        )}
      </Link>

      <div className="tpc-meta">
        <span className="tpc-kicker">{cardKicker(a, stream, fallback)}</span>
        <time dateTime={a.published_at ?? undefined}>{apDate(a.published_at)}</time>
      </div>

      <h3 className="tpc-hed">
        <Link href={`/atlas-brief/${a.slug}`} onClick={preview}>{calmHeadline(a.headline)}</Link>
      </h3>

      {meta && <p className={isTape ? 'tpc-place' : 'tpc-dek'}>{meta}</p>}

      {/* PARKED (2026-11-04, Lucas: "get rid of those red and green sold
          boxes"): the status badge under each Tape card. Restore by pasting
          this back and re-importing statusBadgeKey/statusKicker.
          {isTape && a.listing?.status && (
            <span className={`badge badge-${statusBadgeKey(a.listing.status)} tpc-badge`}>
              {statusKicker(a.listing.status)}
            </span>
          )} */}
    </article>
  )
}

export default function CardFeed({
  rows,
  stream,
  fallbackLabel,
  pageSize = PAGE_SIZE,
}: {
  rows: ArticleCard[]
  stream: Stream
  // Kicker text for an entry that carries no category of its own.
  fallbackLabel: string
  // Cards per page. The Tape passes 13, its mixed-size layout in cards.css;
  // Owner's Notes keeps the default 24.
  pageSize?: number
}) {
  const [page, setPage] = useState(0)
  // The deal open in the Tape's preview, if any (ArchivePreview).
  const [previewing, setPreviewing] = useState<ArticleCard | null>(null)
  // True while the outgoing page is fading. The swap happens at the far end of
  // that fade, so the cards never change in front of the reader.
  const [fading, setFading] = useState(false)
  const gridRef = useRef<HTMLDivElement>(null)
  // Set only when a page turn came from a click, so the first load doesn't
  // yank the reader down the page or steal focus.
  const turned = useRef(false)
  const fadeTimer = useRef<number | null>(null)

  const pageCount = Math.max(1, Math.ceil(rows.length / pageSize))
  // Clamp rather than trust: the feed can shrink under us between renders.
  const current = Math.min(page, pageCount - 1)
  const shown = rows.slice(current * pageSize, current * pageSize + pageSize)

  // Matches the .tpc-grid transition in section.css. Kept in sync by hand —
  // reading it off the element would mean a getComputedStyle per click for a
  // number that changes about never.
  const FADE_MS = 200

  function turn(to: number) {
    const next = Math.min(Math.max(to, 0), pageCount - 1)
    if (next === current) return
    turned.current = true

    // Someone holding down the arrow shouldn't stack timers; the last click
    // wins and the fade it started keeps running.
    if (fadeTimer.current) window.clearTimeout(fadeTimer.current)

    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
      setPage(next)
      return
    }

    setFading(true)
    fadeTimer.current = window.setTimeout(() => {
      fadeTimer.current = null
      setPage(next)
      setFading(false)
    }, FADE_MS)
  }

  useEffect(() => () => {
    if (fadeTimer.current) window.clearTimeout(fadeTimer.current)
  }, [])

  useEffect(() => {
    if (!turned.current) return
    turned.current = false
    // Back to the top of the grid — a turned page that leaves you mid-scroll
    // reads as the same page having changed under you. Instant rather than
    // smooth: it happens while the grid is still faded out, so there's nothing
    // to watch, and a smooth scroll would run on past the fade back in.
    gridRef.current?.scrollIntoView({ block: 'start', behavior: 'auto' })
    gridRef.current?.querySelector<HTMLElement>('.tpc-hed a')?.focus({ preventScroll: true })
  }, [current])

  // `.tpc-dispatch` on the wrapper is what swaps red for blue; see cards.css.
  return (
    // `.tpc-tape` lets the Tape restyle its cards without touching Owner's Notes.
    <div className={stream === 'dispatch' ? 'tpc-dispatch' : 'tpc-tape'}>
      {shown.length === 0 ? (
        <p className="sec-empty">Nothing here yet.</p>
      ) : (
        <>
          {/* Where you are in the run. aria-live so a screen reader hears it
              change when the page turns — the cards below all swap at once
              with nothing else announcing it. */}
          {pageCount > 1 && (
            <div className="tpc-bar">
              <span className="tpc-pageno" aria-live="polite">
                Page {current + 1} of {pageCount}
              </span>
            </div>
          )}

          {/* is-mirrored flips every second page; only .tpc-tape styles it. */}
          <div
            className={`tpc-grid${current % 2 === 1 ? ' is-mirrored' : ''}${fading ? ' is-fading' : ''}`}
            ref={gridRef}
          >
            {shown.map(a => (
              <FeedCard
                key={a.id}
                a={a}
                stream={stream}
                fallback={fallbackLabel}
                onPreview={stream === 'tape' ? setPreviewing : undefined}
              />
            ))}
          </div>

          {pageCount > 1 && (
            <nav className="tpc-pager" aria-label="More entries">
              {/* Arrows only. The label stays on aria-label so a screen
                  reader still gets "Newer entries" rather than a glyph —
                  and Newer/Older, not Previous/Next, because the run is
                  chronological. */}
              <button
                type="button"
                className="tpc-page-btn"
                aria-label="Newer entries"
                onClick={() => turn(current - 1)}
                disabled={current === 0 || fading}
              >
                <span aria-hidden="true">&#8249;</span>
              </button>

              <div className="tpc-dots">
                {Array.from({ length: pageCount }, (_, i) => (
                  <button
                    key={i}
                    type="button"
                    className={`tpc-dot${i === current ? ' is-active' : ''}`}
                    aria-label={`Page ${i + 1}`}
                    aria-current={i === current ? 'true' : undefined}
                    disabled={fading}
                    onClick={() => turn(i)}
                  />
                ))}
              </div>

              <button
                type="button"
                className="tpc-page-btn"
                aria-label="Older entries"
                onClick={() => turn(current + 1)}
                disabled={current === pageCount - 1 || fading}
              >
                <span aria-hidden="true">&#8250;</span>
              </button>
            </nav>
          )}
        </>
      )}
      {stream === 'tape' && (
        <ArchivePreview
          article={previewing}
          list={rows}
          onNavigate={setPreviewing}
          onClosed={() => setPreviewing(null)}
        />
      )}
    </div>
  )
}
