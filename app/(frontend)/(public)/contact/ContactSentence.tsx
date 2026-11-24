'use client'

import { useState } from 'react'
import { EMAIL_RE } from '@/lib/email-address'

// Contact layout 2 (Lucas, 2026-11-23): the form as one sentence in large
// Times, in a single column. The inquiry type is a dropdown inside it:
//   "I'm writing about [an acquisition inquiry ▾].
//    My name is [      ], reach me at [      ]."
// then the message box and the button. The picked inquiry's paragraph sits
// small under the first line, so the CMS text still shows.
// NOT CONNECTED, same as ContactForm.tsx: a valid submit just says so.
// Styles: contact.css .c-v2.

type Inquiry = { id?: string | null; heading?: string | null; body?: string | null }

// "For acquisition inquiries" -> "an acquisition inquiry"
function phraseOf(heading?: string | null) {
  const topic = (heading || '').replace(/^for\s+/i, '').replace(/\s+inquir(y|ies)\s*$/i, '').trim()
  return `${/^[aeiou]/i.test(topic) ? 'an' : 'a'} ${topic} inquiry`
}

export default function ContactSentence({ inquiries }: { inquiries: Inquiry[] }) {
  const [picked, setPicked] = useState(0)
  const [name, setName] = useState('')
  const [email, setEmail] = useState('')
  const [message, setMessage] = useState('')
  const [error, setError] = useState('')
  const clear = () => { if (error) setError('') }

  function submit(e: React.FormEvent) {
    e.preventDefault()
    if (!name.trim()) return setError('Please enter your full name.')
    if (!EMAIL_RE.test(email.trim())) return setError('Please enter a valid email address.')
    if (!message.trim()) return setError('Please write a message.')
    setError('This form isn’t connected yet.')
  }

  return (
    <form className="c-say" onSubmit={submit} noValidate aria-label="Drop us a line">
      <p className="c-say-line">
        I’m writing about{' '}
        <span className="c-say-pick">
          {/* Invisible copy of the picked phrase: it sets the width, so the
              dropdown hugs its text instead of its longest option. */}
          <span className="c-say-mirror" aria-hidden="true">{phraseOf(inquiries[picked]?.heading)}</span>
          <select
            aria-label="What it’s about"
            value={picked}
            onChange={e => setPicked(Number(e.target.value))}
          >
            {inquiries.map((inq, i) => (
              <option key={inq.id || i} value={i}>{phraseOf(inq.heading)}</option>
            ))}
          </select>
        </span>
        .
      </p>
      {inquiries[picked]?.body && <p className="c-say-note">{inquiries[picked].body}</p>}
      <p className="c-say-line">
        My name is{' '}
        <input
          type="text"
          aria-label="Full name"
          value={name}
          onChange={e => { setName(e.target.value); clear() }}
          placeholder="your name"
          autoComplete="name"
          maxLength={120}
          className="c-say-name"
        />
        , reach me at{' '}
        <input
          type="email"
          aria-label="Email address"
          value={email}
          onChange={e => { setEmail(e.target.value); clear() }}
          placeholder="you@example.com"
          autoComplete="email"
          maxLength={254}
          className="c-say-email"
        />
        .
      </p>
      <textarea
        className="c-say-msg"
        aria-label="Message"
        value={message}
        onChange={e => { setMessage(e.target.value); clear() }}
        placeholder="And here’s what I’d like to say…"
        rows={5}
        maxLength={4000}
      />
      {error && <p className="c-line-err" role="alert">{error}</p>}
      <button type="submit" className="c-line-submit">Submit</button>
    </form>
  )
}
