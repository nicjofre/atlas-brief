'use client'

import { useState } from 'react'
import { EMAIL_RE } from '@/lib/email-address'

// "Drop us a line" on the contact page (Lucas, 2026-11-22, from a screenshot):
// full name, email, message, submit. Set like the /subscribe form (labels over
// boxed fields, the blue button that turns red on hover); its own c-line-
// classes in contact.css, since subscribe.css only loads on /subscribe.
//
// NOT CONNECTED YET: there is no endpoint for it. The deal-submission route it
// would resemble was switched off for spam (api/deals/submit), so where the
// message goes, and how bots are kept out, is Lucas's call. Until then a valid
// submit just says so; nothing is sent or stored.

export default function ContactForm() {
  const [name, setName] = useState('')
  const [email, setEmail] = useState('')
  const [message, setMessage] = useState('')
  const [error, setError] = useState('')

  function submit(e: React.FormEvent) {
    e.preventDefault()
    if (!name.trim()) return setError('Please enter your full name.')
    if (!EMAIL_RE.test(email.trim())) return setError('Please enter a valid email address.')
    if (!message.trim()) return setError('Please write a message.')
    setError('This form isn’t connected yet.')
  }

  const clear = () => { if (error) setError('') }

  return (
    // The "Drop us a line" heading removed (Lucas, 2026-11-22). It was:
    //   <h2 id="c-line-hed" className="c-line-hed">Drop us a line</h2>
    // with aria-labelledby="c-line-hed" on the section. .c-line-hed is still
    // styled in contact.css.
    <section className="c-line" aria-label="Drop us a line">
      <form className="c-line-form" onSubmit={submit} noValidate>
        <label className="c-line-field">
          <span>Full name</span>
          <input
            type="text"
            value={name}
            onChange={e => { setName(e.target.value); clear() }}
            placeholder="What’s your full name?"
            autoComplete="name"
            maxLength={120}
          />
        </label>
        <label className="c-line-field">
          <span>Email address</span>
          <input
            type="email"
            value={email}
            onChange={e => { setEmail(e.target.value); clear() }}
            placeholder="you@example.com"
            autoComplete="email"
            maxLength={254}
          />
        </label>
        <label className="c-line-field">
          <span>Message</span>
          <textarea
            value={message}
            onChange={e => { setMessage(e.target.value); clear() }}
            placeholder="Write your message for the team here"
            rows={5}
            maxLength={4000}
          />
        </label>
        {error && <p className="c-line-err" role="alert">{error}</p>}
        <button type="submit" className="c-line-submit">Submit</button>
      </form>
    </section>
  )
}
