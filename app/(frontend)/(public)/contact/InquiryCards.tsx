'use client'

import { useState } from 'react'

// The inquiry title cards on the contact page, each a dropdown (Lucas,
// 2026-11-22). Smoother opening (Lucas, 2026-11-23: "jarring"): they were
// native <details>, which snap open and can't be animated in Safari. Now a
// button toggles the card and the paragraph slides open and fades in
// (contact.css, .c-titles-body). Several can be open at once, as before.

// The red line over the panel, off with the panel (Lucas, 2026-11-23).
const showRule = false as boolean

type Inquiry ={ id?: string | null; heading?: string | null; body?: string | null }

export default function InquiryCards({ inquiries }: { inquiries: Inquiry[] }) {
  const [open, setOpen] = useState<Record<number, boolean>>({})

  return (
    <ul className="c-titles">
      {inquiries.map((inq, i) => {
        const isOpen = !!open[i]
        const bodyId = `c-inq-${i}`
        return (
          <li key={inq.id || i} className={isOpen ? 'is-open' : undefined}>
            {/* One hand-drawn red line along the top of the panel (Lucas,
                2026-11-23), the front page's "Latest" rule (FrontTop.tsx
                .ft-hand-rule) run corner to corner. It sits in the first card
                but is placed against the whole list (contact.css). */}
            {showRule && i === 0 && (
              <svg className="c-titles-rule" viewBox="0 0 400 12" preserveAspectRatio="none" aria-hidden="true">
                <path d="M0 7 C 70 3, 140 10, 210 6 S 340 3, 400 7" />
              </svg>
            )}
            <button
              type="button"
              className="c-titles-btn"
              aria-expanded={isOpen}
              aria-controls={bodyId}
              onClick={() => setOpen((o) => ({ ...o, [i]: !o[i] }))}
            >
              {/* The span carries the hover highlight, so it hugs each line of
                  a title that wraps (contact.css .c-titles-hl). */}
              <h2><span className="c-titles-hl">{inq.heading}</span></h2>
              {/* Chevron taken off (Lucas, 2026-11-23); the title highlights
                  on hover instead. Was, to restore (styles still in contact.css):
                  <svg className="c-titles-chev" viewBox="0 0 24 24" width="22" height="22" aria-hidden="true">
                    <path d="M6 9l6 6 6-6" fill="none" stroke="currentColor" strokeWidth="2.25" strokeLinecap="round" strokeLinejoin="round" />
                  </svg> */}
            </button>
            <div className="c-titles-body" id={bodyId} aria-hidden={!isOpen}>
              <div>
                <p>{inq.body}</p>
              </div>
            </div>
          </li>
        )
      })}
    </ul>
  )
}
