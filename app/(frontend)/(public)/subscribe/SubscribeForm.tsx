'use client'

import { useState } from 'react'
import { trackNewsletterSignup } from '@/lib/analytics/conversions'
import { markSubscribed } from '@/lib/subscribe-flag'

// The /subscribe page's form. The same fields as the homepage's DispatchForm —
// email, first and last name, optional role — but laid out on the page in one
// step: someone who came to /subscribe has already decided, so there's no
// email-first step and no second pop-up for the names. Its own styles, in
// subscribe.css, because DispatchForm's live in home.css and only load there.

const ROLES = ['Broker', 'Investor', 'Owner-Operator', 'Lender', 'Other']
const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
const SOURCE = 'subscribe_page'

type State = 'idle' | 'submitting' | 'sent'

export default function SubscribeForm() {
  const [email, setEmail] = useState('')
  const [firstName, setFirstName] = useState('')
  const [lastName, setLastName] = useState('')
  const [role, setRole] = useState('')
  const [state, setState] = useState<State>('idle')
  const [error, setError] = useState('')

  async function submit(e: React.FormEvent) {
    e.preventDefault()
    if (state === 'submitting') return
    if (!EMAIL_RE.test(email.trim())) {
      setError('Please enter a valid email address.')
      return
    }
    if (!firstName.trim() || !lastName.trim()) {
      setError('Please enter your first and last name.')
      return
    }
    setState('submitting')
    setError('')
    try {
      const res = await fetch('/api/subscribe', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email: email.trim(),
          first_name: firstName.trim(),
          last_name: lastName.trim(),
          role: role || undefined,
          source: SOURCE,
        }),
      })
      if (!res.ok) {
        const data = await res.json().catch(() => ({}))
        setError(data?.error || 'Something went wrong. Please try again.')
        setState('idle')
        return
      }
      trackNewsletterSignup(SOURCE)
      markSubscribed()
      setState('sent')
    } catch {
      setError('Something went wrong. Please try again.')
      setState('idle')
    }
  }

  if (state === 'sent') {
    return (
      <div className="sp-done" role="status">
        <p className="sp-done-head">Done. You&rsquo;re on the list.</p>
        <p className="sp-done-sub">
          The next Friday Dispatch goes to <b>{email.trim()}</b>.
        </p>
      </div>
    )
  }

  const busy = state === 'submitting'
  const clear = () => { if (error) setError('') }

  return (
    <form className="sp-form" onSubmit={submit} noValidate>
      <label className="sp-field">
        <span>Email</span>
        <input
          type="email"
          value={email}
          onChange={e => { setEmail(e.target.value); clear() }}
          placeholder="name@domain.com"
          autoComplete="email"
          maxLength={254}
        />
      </label>

      <div className="sp-row">
        <label className="sp-field">
          <span>First name</span>
          <input
            type="text"
            value={firstName}
            onChange={e => { setFirstName(e.target.value); clear() }}
            placeholder="Jane"
            autoComplete="given-name"
            maxLength={80}
          />
        </label>
        <label className="sp-field">
          <span>Last name</span>
          <input
            type="text"
            value={lastName}
            onChange={e => { setLastName(e.target.value); clear() }}
            placeholder="Smith"
            autoComplete="family-name"
            maxLength={80}
          />
        </label>
      </div>

      <label className="sp-field">
        <span>You are a&hellip; (optional)</span>
        <select value={role} onChange={e => setRole(e.target.value)}>
          <option value="">Prefer not to say</option>
          {ROLES.map(r => <option key={r} value={r}>{r}</option>)}
        </select>
      </label>

      {error && <p className="sp-err" role="alert">{error}</p>}

      <button type="submit" className="sp-submit" disabled={busy}>
        {busy ? 'Subscribing…' : 'Subscribe'}
      </button>
    </form>
  )
}
