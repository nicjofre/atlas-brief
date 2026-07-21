'use client'

import { useState } from 'react'
import { trackConversion, CONVERSIONS } from '@/lib/analytics/conversions'
import { markSubscribed } from '@/lib/subscribe-flag'

// Friday dispatch signup. Two steps so we can collect a little context without
// walling off the email:
//   1. Inline form captures the email.
//   2. A pop-up asks for first name + role (both optional) and completes the
//      signup in a SINGLE POST to /api/subscribe. We submit on the modal — not
//      on the inline button — because the subscribers table is anon insert-only
//      (no UPDATE), so everything has to land in one insert.
// Skipping the extra fields still subscribes (email only).

const ROLES = ['Broker', 'Investor', 'Owner-Operator', 'Lender', 'Other']
const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/

type State = 'idle' | 'modal' | 'submitting' | 'sent' | 'error'

export default function DispatchForm() {
  const [email, setEmail] = useState('')
  const [firstName, setFirstName] = useState('')
  const [lastName, setLastName] = useState('')
  const [role, setRole] = useState('')
  const [state, setState] = useState<State>('idle')
  const [error, setError] = useState('')

  function onEmailSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError('')
    if (!EMAIL_RE.test(email.trim())) {
      setError('Please enter a valid email address.')
      setState('error')
      return
    }
    setState('modal')
  }

  async function complete() {
    if (state === 'submitting') return
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
        }),
      })
      if (!res.ok) {
        const data = await res.json().catch(() => ({}))
        setError(data?.error || 'Something went wrong. Please try again.')
        setState('modal')
        return
      }
      trackConversion(CONVERSIONS.newsletterSignup)
      markSubscribed()
      setState('sent')
    } catch {
      setError('Something went wrong. Please try again.')
      setState('modal')
    }
  }

  return (
    <>
      <form
        className={`tm-dispatch${state === 'sent' ? ' sent' : ''}`}
        onSubmit={onEmailSubmit}
        noValidate
      >
        <div className="tm-d-head">
          <span className="tm-d-label">Subscribe to the Friday Dispatch</span>
          <span className="tm-d-note">
            One note per week &mdash; what traded, what&rsquo;s listed, what the numbers say. Free.
          </span>
        </div>
        <div className="tm-d-row">
          <input
            type="email"
            name="email"
            placeholder="name@domain.com"
            required
            autoComplete="email"
            aria-label="Email address"
            value={email}
            onChange={(e) => {
              setEmail(e.target.value)
              if (state === 'error') setState('idle')
            }}
          />
          <button type="submit">Subscribe</button>
        </div>
        <span className="tm-d-sent">✓ You are on the list.</span>
        {state === 'error' && (
          <span className="tm-d-err" role="alert">
            {error}
          </span>
        )}
      </form>

      {(state === 'modal' || state === 'submitting') && (
        <div
          className="tm-modal-overlay"
          role="dialog"
          aria-modal="true"
          aria-label="Tell us a bit about you"
          onClick={(e) => {
            if (e.target === e.currentTarget && state !== 'submitting') setState('idle')
          }}
        >
          <div className="tm-modal">
            <button
              type="button"
              className="tm-modal-x"
              aria-label="Close"
              onClick={() => state !== 'submitting' && setState('idle')}
            >
              &times;
            </button>
            <div className="tm-modal-kicker">Almost in</div>
            <h3 className="tm-modal-title">Tell us who you are</h3>
            <p className="tm-modal-sub">
              So David knows who&rsquo;s reading. You&rsquo;re subscribing as{' '}
              <b>{email.trim()}</b>.
            </p>

            <div className="tm-modal-row">
              <label className="tm-modal-field">
                <span>First name</span>
                <input
                  type="text"
                  value={firstName}
                  onChange={(e) => {
                    setFirstName(e.target.value)
                    if (error) setError('')
                  }}
                  placeholder="Jane"
                  autoComplete="given-name"
                  maxLength={80}
                />
              </label>
              <label className="tm-modal-field">
                <span>Last name</span>
                <input
                  type="text"
                  value={lastName}
                  onChange={(e) => {
                    setLastName(e.target.value)
                    if (error) setError('')
                  }}
                  placeholder="Smith"
                  autoComplete="family-name"
                  maxLength={80}
                />
              </label>
            </div>

            <label className="tm-modal-field">
              <span>You are a&hellip; (optional)</span>
              <select value={role} onChange={(e) => setRole(e.target.value)}>
                <option value="">Prefer not to say</option>
                {ROLES.map((r) => (
                  <option key={r} value={r}>
                    {r}
                  </option>
                ))}
              </select>
            </label>

            {state === 'modal' && error && (
              <p className="tm-modal-err" role="alert">
                {error}
              </p>
            )}

            <button
              type="button"
              className="tm-modal-submit"
              onClick={complete}
              disabled={state === 'submitting'}
            >
              {state === 'submitting' ? 'Subscribing…' : 'Subscribe'}
            </button>
          </div>
        </div>
      )}
    </>
  )
}
