'use client'

import { useState } from 'react'
import { trackConversion, CONVERSIONS } from '@/lib/analytics/conversions'
import { markSubscribed } from '@/lib/subscribe-flag'

const PDF_URL = '/atlas-survival-guide.pdf'
type State = 'idle' | 'submitting' | 'done' | 'error'

export default function GuideForm() {
  const [name, setName] = useState('')
  const [email, setEmail] = useState('')
  const [state, setState] = useState<State>('idle')
  const [message, setMessage] = useState('')
  const [emailed, setEmailed] = useState(true)

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (state === 'submitting') return
    if (!name.trim()) { setState('error'); setMessage('Please enter your name.'); return }
    if (!email.trim()) { setState('error'); setMessage('Please enter your email.'); return }
    setState('submitting')
    setMessage('')
    try {
      const res = await fetch('/api/white-paper/lead', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name, email }),
      })
      const data = await res.json().catch(() => ({}))
      if (!res.ok) { setState('error'); setMessage(data?.error || 'Something went wrong. Please try again.'); return }
      trackConversion(CONVERSIONS.whitePaper)
      markSubscribed()
      setEmailed(data?.emailed !== false)
      setState('done')
    } catch {
      setState('error'); setMessage('Something went wrong. Please try again.')
    }
  }

  if (state === 'done') {
    return (
      <div className="sg-done">
        <strong>Check your inbox.</strong>
        {emailed ? (
          <span>I just emailed the guide to <b>{email}</b>. It&rsquo;s attached as a PDF. (Give it a minute, and peek in spam if you don&rsquo;t see it.)</span>
        ) : (
          <>
            <span>You&rsquo;re on the list. The email is on its way — or grab it right here:</span>
            <a href={PDF_URL} target="_blank" rel="noopener noreferrer" className="sg-btn sg-btn-primary">Download the guide (PDF)</a>
          </>
        )}
      </div>
    )
  }

  return (
    <form className="sg-form" onSubmit={onSubmit} noValidate>
      <div className="sg-card-head">Get the guide</div>
      <p className="sg-card-sub">Tell me who you are and it&rsquo;s yours.</p>
      <input className="sg-input" type="text" placeholder="Full name *" aria-label="Full name"
        value={name} onChange={(e) => setName(e.target.value)} />
      <input className="sg-input" type="email" placeholder="Email address *" aria-label="Email address"
        value={email} onChange={(e) => setEmail(e.target.value)} />
      {state === 'error' && <p className="sg-err">{message}</p>}
      <button type="submit" className="sg-btn sg-btn-primary" disabled={state === 'submitting'}>
        {state === 'submitting' ? 'Sending…' : 'Email me the guide'}
      </button>
      <p className="sg-fine">
        I&rsquo;ll email you the PDF and add you to the Friday dispatch, one note a week. Unsubscribe anytime.
      </p>
    </form>
  )
}
