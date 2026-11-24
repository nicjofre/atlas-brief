'use client'

import { useEffect, useState } from 'react'
import ContactForm from './ContactForm'

// Contact layout 3 (Lucas, 2026-11-23): a quiet directory, nothing hidden.
// Each inquiry is a left-aligned Times title with its paragraph always shown,
// and a small "Write about this" link under it. The link puts that topic on
// the form beside it (the Message label and hint) and moves the cursor into
// the message box. Rendered straight into .c-main's grid: the directory on
// the left, the form on the right. Styles: contact.css .c-v3.

type Inquiry = { id?: string | null; heading?: string | null; body?: string | null }

// The link under each inquiry, its own line per topic (Lucas, 2026-11-23;
// was "Write about this" for all three). Matched on the heading's wording;
// anything unrecognised falls back to "Start a message".
function linkFor(heading?: string | null) {
  const h = (heading || '').toLowerCase()
  if (h.includes('editorial')) return 'Pitch us a deal'
  if (h.includes('construction') || h.includes('development')) return 'Tell us about the project'
  if (h.includes('acquisition')) return 'Tell us about the business'
  return 'Start a message'
}

function topicOf(heading?: string | null) {
  return (heading || '').replace(/^for\s+/i, '').replace(/\s+inquir(y|ies)\s*$/i, '').trim()
}

export default function ContactDirectory({ inquiries }: { inquiries: Inquiry[] }) {
  const [picked, setPicked] = useState<number | null>(null)

  // The form stays hidden until an option is clicked (Lucas, 2026-11-23).
  // Once it opens, bring it into view and put the cursor in the message box.
  // Runs after the render that takes `inert` off, so the box can take focus.
  useEffect(() => {
    if (picked === null) return
    const t = window.setTimeout(() => {
      const form = document.querySelector<HTMLElement>('.c-v3 .c-reveal .c-line')
      form?.scrollIntoView({ behavior: 'smooth', block: 'start' })
      form?.querySelector<HTMLTextAreaElement>('textarea')?.focus({ preventScroll: true })
    }, 60)
    return () => window.clearTimeout(t)
  }, [picked])

  function write(i: number) {
    setPicked(i)
  }

  return (
    <>
      <ul className="c-dir">
        {inquiries.map((inq, i) => (
          <li key={inq.id || i}>
            <h2>{inq.heading}</h2>
            <p>{inq.body}</p>
            <button
              type="button"
              className="c-dir-write"
              aria-pressed={picked === i}
              onClick={() => write(i)}
            >
              {/* Same words once clicked; it turns red to show it's the one. */}
              {linkFor(inq.heading)}
            </button>
          </li>
        ))}
      </ul>
      {/* Hidden (and out of the tab order) until an option is picked, then
          slides open. contact.css .c-reveal. */}
      <div className={`c-reveal${picked !== null ? ' is-open' : ''}`} inert={picked === null}>
        <div>
          <ContactForm topic={picked === null ? '' : topicOf(inquiries[picked]?.heading)} />
        </div>
      </div>
    </>
  )
}
