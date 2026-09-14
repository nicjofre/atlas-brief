'use client'

import { useState } from 'react'
import { trackNewsletterSignup } from '@/lib/analytics/conversions'
import { markSubscribed } from '@/lib/subscribe-flag'
import './signup-box.css'

// A signup box rendered in the article itself, under the headline.
//
// It exists because the pop-up can't be relied on everywhere. The modal needs
// JavaScript, a scroll threshold, and localStorage; in-app browsers (Instagram
// especially, where a lot of David's traffic arrives) are the least predictable
// place for all three. This box is just markup in the page: no trigger, no
// timing, nothing to fail. If the modal never fires, the ask is still on screen.
//
// Deliberately NOT suppressed by the modal's dismissal flag. It isn't an
// interruption, so there's nothing to dismiss — it behaves like the rest of the
// article. It does hide once this browser has subscribed, so a subscriber isn't
// asked again mid-read.

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/

export default function ArticleSignupBox({
  slug,
  // Signed-in admins don't see reader capture anywhere else; keep that true here.
  enabled = true,
}: {
  slug: string
  enabled?: boolean
}) {
  const [email, setEmail] = useState('')
  const [state, setState] = useState<'idle' | 'submitting' | 'sent'>('idle')
  const [error, setError] = useState('')

  if (!enabled) return null

  async function submit(e: React.FormEvent) {
    e.preventDefault()
    if (state === 'submitting') return
    if (!EMAIL_RE.test(email.trim())) {
      setError('Please enter a valid email address.')
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
          source: 'article_inline',
          // Which piece earned the signup.
          source_slug: slug,
        }),
      })
      if (!res.ok) {
        const data = await res.json().catch(() => ({}))
        setError(data?.error || 'Something went wrong. Please try again.')
        setState('idle')
        return
      }
      trackNewsletterSignup('article_inline')
      markSubscribed()
      setState('sent')
    } catch {
      setError('Something went wrong. Please try again.')
      setState('idle')
    }
  }

  if (state === 'sent') {
    return (
      <aside className="asb asb-done" aria-live="polite">
        <p className="asb-done-text">
          You&rsquo;re on the list. The next Dispatch lands Friday morning.
        </p>
      </aside>
    )
  }

  return (
    <aside className="asb">
      <div className="asb-copy">
        <span className="asb-kicker">The Friday Dispatch</span>
        <p className="asb-pitch">
          David Safai builds and owns multifamily in Los Angeles. Every Friday he
          sends what traded, what it really sold for, and what the numbers say
          the market is doing. Free.
        </p>
      </div>
      {/* noValidate so our own message shows instead of the browser bubble,
          which in-app browsers render inconsistently. */}
      <form className="asb-form" onSubmit={submit} noValidate>
        <label className="asb-label" htmlFor={`asb-email-${slug}`}>
          Email address
        </label>
        <div className="asb-row">
          <input
            id={`asb-email-${slug}`}
            type="email"
            inputMode="email"
            autoComplete="email"
            placeholder="name@domain.com"
            value={email}
            onChange={e => {
              setEmail(e.target.value)
              if (error) setError('')
            }}
            maxLength={254}
          />
          <button type="submit" disabled={state === 'submitting'}>
            {state === 'submitting' ? 'Adding…' : 'Subscribe'}
          </button>
        </div>
        {error && <p className="asb-err" role="alert">{error}</p>}
      </form>
    </aside>
  )
}
