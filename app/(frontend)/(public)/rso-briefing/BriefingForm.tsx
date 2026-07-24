'use client'

import { useState } from 'react'
import { trackConversion, CONVERSIONS } from '@/lib/analytics/conversions'
import { markSubscribed } from '@/lib/subscribe-flag'

type State = 'idle' | 'submitting' | 'done' | 'error'

export default function BriefingForm() {
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
      const res = await fetch('/api/rso-briefing/lead', {
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
      <div className="abx-done">
        <strong>Check your inbox.</strong>
        {emailed ? (
          <span>I just emailed the briefing to <b>{email}</b> — two PDFs, one for desktop and one for phone. Give it a minute, and peek in spam if it&rsquo;s not there.</span>
        ) : (
          <span>
            You&rsquo;re on the list — the email is on its way, or grab it here:{' '}
            <a href="/atlas-rso-briefing-desktop.pdf" target="_blank" rel="noopener noreferrer">Download the briefing (PDF)</a>
          </span>
        )}
      </div>
    )
  }

  return (
    <form className="abx-form" onSubmit={onSubmit} noValidate>
      <div className="abx-formhead">Get the PDF &rarr;</div>
      <div className="abx-field">
        <label htmlFor="abx-name">Name</label>
        <input id="abx-name" type="text" name="name" placeholder="Jane Operator" autoComplete="name"
          value={name} onChange={(e) => setName(e.target.value)} />
      </div>
      <div className="abx-field">
        <label htmlFor="abx-email">Email</label>
        <input id="abx-email" type="email" name="email" placeholder="jane@email.com" autoComplete="email"
          value={email} onChange={(e) => setEmail(e.target.value)} />
      </div>
      {state === 'error' && <p className="abx-err">{message}</p>}
      <button type="submit" disabled={state === 'submitting'}>
        {state === 'submitting' ? 'Sending…' : 'Send me the briefing'}
      </button>
      <p className="abx-fine">Arrives as two PDFs — one for desktop, one for phone. You&rsquo;ll also join the Friday dispatch — unsubscribe anytime.</p>
    </form>
  )
}
