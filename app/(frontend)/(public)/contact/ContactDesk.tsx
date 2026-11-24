'use client'

import { useState } from 'react'
import ContactForm from './ContactForm'

// Contact layout 1 (Lucas, 2026-11-23): the three inquiry titles are the
// form's first question. Picking one marks it with a red bar, greys the other
// two, opens its paragraph underneath, and the message box asks about that
// topic. One is always picked. Rendered straight into .c-main's
// grid: the list on the left, the form on the right. Styles: contact.css .c-v1.

type Inquiry = { id?: string | null; heading?: string | null; body?: string | null }

// "For construction or development inquiries" -> "construction or development"
function topicOf(heading?: string | null) {
  return (heading || '').replace(/^for\s+/i, '').replace(/\s+inquir(y|ies)\s*$/i, '').trim()
}

export default function ContactDesk({ inquiries }: { inquiries: Inquiry[] }) {
  // One is always picked, the first to start, so the page opens looking like
  // Lucas's sketch: bar, paragraph, and the form asking about it.
  const [picked, setPicked] = useState<number>(0)
  const topic = topicOf(inquiries[picked]?.heading)

  return (
    <>
      <ul className="c-pick has-pick">
        {inquiries.map((inq, i) => {
          const on = picked === i
          return (
            <li key={inq.id || i} className={on ? 'is-on' : undefined}>
              <button
                type="button"
                className="c-pick-btn"
                aria-pressed={on}
                aria-controls={`c-pick-${i}`}
                onClick={() => setPicked(i)}
              >
                {inq.heading}
              </button>
              <div className="c-pick-body" id={`c-pick-${i}`} aria-hidden={!on}>
                <div>
                  <p>{inq.body}</p>
                </div>
              </div>
            </li>
          )
        })}
      </ul>
      <ContactForm topic={topic} />
    </>
  )
}
