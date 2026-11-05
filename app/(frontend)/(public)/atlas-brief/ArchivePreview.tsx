'use client'

import { useEffect, useRef, useState } from 'react'
import Link from 'next/link'
import type { ArticleCard } from '@/lib/db/articles'
import { calmHeadline } from '@/lib/db/headline-case'

// The Tape archive's preview (2026-11-04, Lucas's design): a plain click on an
// archive card opens this instead of the article. Photo, sold / for sale,
// headline, the deal's details, the first lines of David's write-up, and a red
// "Read more" to the article. Cmd/Ctrl/Shift-click and middle-click still go
// straight to the article (handled in CardFeed), so the cards stay real links.
//
// Built on <dialog> like the Tax Appeals waitlist (tax-appeals/WaitlistModal):
// Escape, the backdrop, focus containment and the page's inertness come from
// the platform, and focus returns to the card on close. Closing is held for
// the fade, since a closed dialog leaves the top layer on the first frame.
// On phones the card rises from the bottom as a sheet (cards.css).

const CLOSE_MS = 160

function statusLabel(s: string | null | undefined): { text: string; key: string } | null {
  if (s === 'sold') return { text: 'Sold', key: 'sold' }
  if (s === 'for_sale') return { text: 'For sale', key: 'forsale' }
  if (s === 'under_construction') return { text: 'Under construction', key: 'other' }
  if (s === 'off_market') return { text: 'Off market', key: 'other' }
  return null
}

function details(a: ArticleCard): string {
  const p = a.listing?.property
  if (!p) return ''
  const parts: string[] = []
  if (p.street_address) parts.push(p.street_address)
  const place = p.neighborhood ?? p.city
  if (place) parts.push(place)
  if (p.unit_count) parts.push(`${p.unit_count} ${p.unit_count === 1 ? 'unit' : 'units'}`)
  if (p.year_built) parts.push(`built ${p.year_built}`)
  return parts.join(', ')
}

// "$15.475M", "$950K". Trailing zeros trimmed: $8M, not $8.000M.
function money(v: number | null | undefined): string {
  if (v == null || !Number.isFinite(Number(v))) return ''
  const n = Number(v)
  if (n >= 1_000_000) return `$${(n / 1_000_000).toFixed(3).replace(/\.?0+$/, '')}M`
  if (n >= 1_000) return `$${Math.round(n / 1_000)}K`
  return `$${Math.round(n)}`
}

// The one number (2026-11-04, Lucas: the sale price is what grabs
// attention): the sale price when sold, "Asking …" when for sale.
function price(a: ArticleCard): string {
  const l = a.listing
  if (!l) return ''
  if (l.status === 'sold') return money(l.sale_price)
  if (l.status === 'for_sale' && l.list_price) return `Asking ${money(l.list_price)}`
  return ''
}

export default function ArchivePreview({
  article,
  list = [],
  onNavigate,
  onClosed,
}: {
  article: ArticleCard | null
  // The archive in order, for Previous / Next and the arrow keys (2026-11-04).
  list?: ArticleCard[]
  onNavigate?: (a: ArticleCard) => void
  onClosed: () => void
}) {
  const ref = useRef<HTMLDialogElement>(null)
  const [closing, setClosing] = useState(false)

  useEffect(() => {
    const el = ref.current
    if (el && article && !el.open) el.showModal()
  }, [article])

  function hide() {
    const el = ref.current
    if (!el || closing) return
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
      el.close()
      return
    }
    setClosing(true)
    window.setTimeout(() => {
      setClosing(false)
      el.close()
    }, CLOSE_MS)
  }

  const at = article ? list.findIndex(x => x.id === article.id) : -1
  const prev = at > 0 ? list[at - 1] : null
  const next = at >= 0 && at < list.length - 1 ? list[at + 1] : null

  // Left / right arrow keys step through the archive without closing.
  useEffect(() => {
    const el = ref.current
    if (!el || !onNavigate) return
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'ArrowLeft' && prev) { e.preventDefault(); onNavigate(prev) }
      if (e.key === 'ArrowRight' && next) { e.preventDefault(); onNavigate(next) }
    }
    el.addEventListener('keydown', onKey)
    return () => el.removeEventListener('keydown', onKey)
  }, [prev, next, onNavigate])

  useEffect(() => {
    const el = ref.current
    if (!el) return
    const onClose = () => onClosed()
    const onCancel = (e: Event) => {
      e.preventDefault()
      hide()
    }
    el.addEventListener('close', onClose)
    el.addEventListener('cancel', onCancel)
    return () => {
      el.removeEventListener('close', onClose)
      el.removeEventListener('cancel', onCancel)
    }
  })

  const a = article
  const status = a ? statusLabel(a.listing?.status) : null
  const meta = a ? details(a) : ''
  const figure = a ? price(a) : ''
  const blurb = a ? (a.deck ?? a.excerpt ?? '') : ''
  const href = a ? `/atlas-brief/${a.slug}` : '#'

  return (
    <dialog
      ref={ref}
      className={`tpv${closing ? ' is-closing' : ''}`}
      onClick={e => { if (e.target === ref.current) hide() }}
      aria-label={a ? calmHeadline(a.headline) : 'Deal preview'}
    >
      {a && (
        // tabIndex + autoFocus: the dialog focuses the card on open instead of
        // the close button, so no focus ring appears until someone tabs.
        <div className="tpv-card" tabIndex={-1} autoFocus>
          {/* Drawn lines rather than the × glyph, which sits off-centre in
              the circle because a character's box isn't symmetric. */}
          <button type="button" className="tpv-x" onClick={hide} aria-label="Close">
            <svg viewBox="0 0 14 14" width="14" height="14" aria-hidden="true">
              <path d="M2 2 L12 12 M12 2 L2 12" />
            </svg>
          </button>
          {a.heroUrl && (
            // eslint-disable-next-line @next/next/no-img-element
            <img className="tpv-img" src={a.heroUrl} alt="" width={720} height={405} />
          )}
          <div className="tpv-body">
            {status && <span className={`tpv-status tpv-${status.key}`}>{status.text}</span>}
            {/* The headline is a link too: people click headlines. */}
            <h2 className="tpv-hed"><Link href={href}>{calmHeadline(a.headline)}</Link></h2>
            {figure && <p className="tpv-price">{figure}</p>}
            {meta && <p className="tpv-meta">{meta}</p>}
            {blurb && <p className="tpv-blurb">{blurb}</p>}
            <div className="tpv-foot">
              <Link href={href} className="tpv-more">Read more</Link>
              {onNavigate && (prev || next) && (
                <nav className="tpv-nav" aria-label="Browse deals">
                  <button type="button" disabled={!prev} onClick={() => prev && onNavigate(prev)}>
                    Previous deal
                  </button>
                  <button type="button" disabled={!next} onClick={() => next && onNavigate(next)}>
                    Next deal
                  </button>
                </nav>
              )}
            </div>
          </div>
        </div>
      )}
    </dialog>
  )
}
