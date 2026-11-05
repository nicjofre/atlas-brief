'use client'

import { useCallback, useEffect, useRef, useState, type ReactNode } from 'react'
import Link from 'next/link'

// The Tape's "Others this week" (2026-11-04, Lucas's design): one large card at
// a time under "Interesting deals", filling the space the short stack leaves
// beside the lead. It turns itself every ROTATE_MS, crossfading, and holds
// still while the pointer is over it or focus is inside it, so nobody loses a
// card mid-read. With reduced motion on it never turns by itself; the ‹ ›
// buttons always work.
//
// Items arrive already shaped on the server (headline calmed, date formatted),
// so this file needs nothing from lib/db.

export type WeekCard = {
  slug: string
  headline: string
  heroUrl: string | null
  place: string
  date: string
}

const ROTATE_MS = 6000
const FADE_MS = 300

export default function WeekCarousel({ items, heading }: { items: WeekCard[]; heading: ReactNode }) {
  const [i, setI] = useState(0)
  const [fading, setFading] = useState(false)
  const held = useRef(false)
  const reduced = useRef(false)
  const fadeTimer = useRef<number | null>(null)
  // The interval reads the index from here rather than closing over `i`.
  const current = useRef(0)
  useEffect(() => { current.current = i }, [i])

  const go = useCallback((next: number) => {
    if (items.length < 2) return
    const to = (next + items.length) % items.length
    if (reduced.current) { setI(to); return }
    setFading(true)
    if (fadeTimer.current) window.clearTimeout(fadeTimer.current)
    fadeTimer.current = window.setTimeout(() => {
      setI(to)
      setFading(false)
    }, FADE_MS)
  }, [items.length])

  useEffect(() => {
    reduced.current = window.matchMedia('(prefers-reduced-motion: reduce)').matches
    if (reduced.current || items.length < 2) return
    const t = window.setInterval(() => {
      if (!held.current && document.visibilityState === 'visible') go(current.current + 1)
    }, ROTATE_MS)
    return () => {
      window.clearInterval(t)
      if (fadeTimer.current) window.clearTimeout(fadeTimer.current)
    }
  }, [go, items.length])

  if (items.length === 0) return null
  const a = items[i]

  return (
    <section
      className="wk"
      aria-roledescription="carousel"
      aria-label="Recent deals"
      onMouseEnter={() => { held.current = true }}
      onMouseLeave={() => { held.current = false }}
      onFocus={() => { held.current = true }}
      onBlur={() => { held.current = false }}
    >
      <h3 className="ts-col-hed wk-hed">{heading}</h3>

      <article className={`wk-card${fading ? ' is-fading' : ''}`} aria-live="polite">
        {a.heroUrl && (
          <Link href={`/atlas-brief/${a.slug}`} className="wk-img" tabIndex={-1} aria-hidden="true">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={a.heroUrl} alt="" width={640} height={480} />
          </Link>
        )}
        <div className="ts-kicker">
          <span>{a.place}</span>
          <time>{a.date}</time>
        </div>
        <h3 className="wk-title">
          <Link href={`/atlas-brief/${a.slug}`}>{a.headline}</Link>
        </h3>
      </article>

      {items.length > 1 && (
        // Dots, one per deal (Lucas, 2026-11-04). Was ‹ › buttons either side
        // of an "X of Y" count (.wk-btn / .wk-count, still in section.css).
        <div className="wk-controls">
          {items.map((it, n) => (
            <button
              key={it.slug}
              type="button"
              className={`wk-dot${n === i ? ' is-active' : ''}`}
              aria-label={`Show deal ${n + 1} of ${items.length}`}
              aria-current={n === i ? 'true' : undefined}
              onClick={() => { if (n !== i) go(n) }}
            />
          ))}
        </div>
      )}
    </section>
  )
}
