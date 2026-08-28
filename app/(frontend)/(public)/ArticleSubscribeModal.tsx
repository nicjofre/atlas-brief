'use client'

import { useCallback, useEffect, useRef, useState } from 'react'
import { trackConversion, CONVERSIONS } from '@/lib/analytics/conversions'
import { markSubscribed, modalSuppressed, markModalDismissed } from '@/lib/subscribe-flag'
import './subscribe-modal.css'

// Signup pop-up for article pages. The pinned bar (ArticleSubscribeBar) stays —
// this fires deeper into the read, when someone has demonstrably engaged.
//
// Everything lands in ONE POST to /api/subscribe: the subscribers table is anon
// insert-only (no UPDATE policy), so a two-step flow can't top up a row after
// the fact. Same constraint the homepage form works around.

const ROLES = ['Broker', 'Investor', 'Owner-Operator', 'Lender', 'Other']
const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/

// The trigger measures progress through the BODY, not the page. These pieces
// carry a lot above the prose (crumb, kicker, headline, deck, byline, hero,
// caption, dealstats), so a reader can be halfway down the document having
// read barely a paragraph. Both templates wrap the prose in .art-body.
const BODY_SELECTOR = '.art-body'
// Fraction of the body scrolled ABOVE the top of the viewport, i.e. prose the
// reader has actually moved through. Measuring what's merely visible would fire
// the moment the body first peeked into view, having read none of it.
const BODY_TRIGGER = 0.25
// Fallback for any article template without .art-body: fall back to whole-page
// depth so the modal degrades to the old behaviour instead of never firing.
const PAGE_TRIGGER = 0.55

type State = 'idle' | 'submitting' | 'sent'

export default function ArticleSubscribeModal({ enabled = true }: { enabled?: boolean }) {
  const [open, setOpen] = useState(false)
  const [state, setState] = useState<State>('idle')
  const [email, setEmail] = useState('')
  const [firstName, setFirstName] = useState('')
  const [lastName, setLastName] = useState('')
  const [role, setRole] = useState('')
  const [error, setError] = useState('')

  const panelRef = useRef<HTMLDivElement>(null)
  const emailRef = useRef<HTMLInputElement>(null)
  // Whatever had focus before we hijacked it, so we can hand it back on close.
  const restoreFocusRef = useRef<HTMLElement | null>(null)
  // Guards against re-opening within the same page view after a dismissal.
  const firedRef = useRef(false)

  // --- Trigger ------------------------------------------------------------
  useEffect(() => {
    let raf = 0

    const fire = () => {
      if (firedRef.current) return
      firedRef.current = true
      setOpen(true)
    }

    // Two escape hatches, because signed in on their own site David and Nic
    // would otherwise never see this at all:
    //   ?capture=preview — opens immediately, ignoring scroll/dwell. For looking
    //                      at the design. NOT what a reader experiences.
    //   ?capture=trigger — keeps the real scroll-depth trigger, only skipping
    //                      the logged-in gate and dismissal clock. For checking
    //                      when it actually fires.
    const mode = new URLSearchParams(window.location.search).get('capture')

    // Deferred a tick so the open isn't a synchronous setState in the effect.
    if (mode === 'preview') {
      const t = window.setTimeout(fire, 0)
      return () => window.clearTimeout(t)
    }

    if (mode !== 'trigger' && (!enabled || modalSuppressed())) return

    const check = () => {
      raf = 0
      if (firedRef.current) return
      const doc = document.documentElement
      // A page shorter than the viewport has no progress to measure. Sit it out
      // rather than treating it as fully read — firing on load is the one
      // behaviour this trigger exists to avoid.
      if (doc.scrollHeight - window.innerHeight <= 0) return

      // Reaching the foot of the page counts however short the body is: the
      // reader is done, and a proportional threshold can be unreachable on a
      // brief whose body is shorter than the screen.
      if (window.scrollY + window.innerHeight >= doc.scrollHeight - 100) {
        fire()
        return
      }

      const body = document.querySelector(BODY_SELECTOR)
      if (body) {
        const rect = body.getBoundingClientRect()
        if (rect.height <= 0) return
        // rect.top goes negative as the body scrolls up past the viewport top,
        // so -top/height is the fraction the reader has moved through.
        const consumed = -rect.top / rect.height
        if (consumed >= BODY_TRIGGER) fire()
        return
      }

      const depth = (window.scrollY + window.innerHeight) / doc.scrollHeight
      if (depth >= PAGE_TRIGGER) fire()
    }

    const onScroll = () => {
      if (raf) return
      raf = window.requestAnimationFrame(check)
    }

    // Covers a restored scroll position that's already past the threshold.
    check()
    window.addEventListener('scroll', onScroll, { passive: true })
    window.addEventListener('resize', onScroll)
    return () => {
      if (raf) window.cancelAnimationFrame(raf)
      window.removeEventListener('scroll', onScroll)
      window.removeEventListener('resize', onScroll)
    }
  }, [enabled])

  const close = useCallback((remember: boolean) => {
    if (remember) markModalDismissed()
    setOpen(false)
  }, [])

  // --- Focus, scroll lock, Escape ----------------------------------------
  useEffect(() => {
    if (!open) return

    restoreFocusRef.current = document.activeElement as HTMLElement | null
    // Focus the first input rather than the panel so a keyboard user can just
    // start typing, and a screen reader announces the field it lands on.
    emailRef.current?.focus()

    const { overflow } = document.body.style
    document.body.style.overflow = 'hidden'

    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        e.preventDefault()
        close(true)
        return
      }
      if (e.key !== 'Tab') return
      // Trap Tab inside the dialog: without this, focus walks off into the
      // article behind the overlay, which is invisible and unusable.
      const nodes = panelRef.current?.querySelectorAll<HTMLElement>(
        'button, input, select, textarea, a[href], [tabindex]:not([tabindex="-1"])'
      )
      if (!nodes || nodes.length === 0) return
      const list = Array.from(nodes).filter(n => !n.hasAttribute('disabled'))
      if (list.length === 0) return
      const first = list[0]
      const last = list[list.length - 1]
      const active = document.activeElement
      if (e.shiftKey && (active === first || !panelRef.current?.contains(active))) {
        e.preventDefault()
        last.focus()
      } else if (!e.shiftKey && active === last) {
        e.preventDefault()
        first.focus()
      }
    }

    document.addEventListener('keydown', onKeyDown)
    return () => {
      document.removeEventListener('keydown', onKeyDown)
      document.body.style.overflow = overflow
      restoreFocusRef.current?.focus?.()
    }
  }, [open, close])

  // Hold the confirmation briefly, then retire the modal.
  useEffect(() => {
    if (state !== 'sent') return
    const t = window.setTimeout(() => setOpen(false), 2600)
    return () => window.clearTimeout(t)
  }, [state])

  if (!open) return null

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
          source: 'article_modal',
        }),
      })
      if (!res.ok) {
        const data = await res.json().catch(() => ({}))
        setError(data?.error || 'Something went wrong. Please try again.')
        setState('idle')
        return
      }
      trackConversion(CONVERSIONS.newsletterSignup)
      markSubscribed()
      setState('sent')
    } catch {
      setError('Something went wrong. Please try again.')
      setState('idle')
    }
  }

  const busy = state === 'submitting'

  return (
    <div
      className="asm-overlay"
      onMouseDown={e => {
        // mousedown, not click: a click that *starts* inside the panel and ends
        // on the backdrop (a sloppy drag off a field) shouldn't close the modal.
        if (e.target === e.currentTarget && !busy) close(true)
      }}
    >
      <div
        ref={panelRef}
        className="asm-panel"
        role="dialog"
        aria-modal="true"
        aria-labelledby="asm-title"
      >
        <button type="button" className="asm-x" aria-label="Close" onClick={() => !busy && close(true)}>
          &times;
        </button>

        {state === 'sent' ? (
          <>
            <div className="asm-kicker">You&rsquo;re in</div>
            <h2 id="asm-title" className="asm-title">Done. You&rsquo;re on the list.</h2>
            <p className="asm-done">
              Next one lands Friday morning. Back to the article.
            </p>
          </>
        ) : (
          <>
            <div className="asm-kicker">The Friday Dispatch</div>
            <h2 id="asm-title" className="asm-title">Deals like this one, every Friday.</h2>
            <p className="asm-sub">
              David Safai reads the LA multifamily tape all week. What traded, what it
              actually penciled at, and what the numbers say the market is doing. One
              email, Friday morning. Free.
            </p>

            <form onSubmit={submit} noValidate>
              <label className="asm-field">
                <span>Email</span>
                <input
                  ref={emailRef}
                  type="email"
                  value={email}
                  onChange={e => { setEmail(e.target.value); if (error) setError('') }}
                  placeholder="name@domain.com"
                  autoComplete="email"
                  maxLength={254}
                />
              </label>

              <div className="asm-row">
                <label className="asm-field">
                  <span>First name</span>
                  <input
                    type="text"
                    value={firstName}
                    onChange={e => { setFirstName(e.target.value); if (error) setError('') }}
                    placeholder="Jane"
                    autoComplete="given-name"
                    maxLength={80}
                  />
                </label>
                <label className="asm-field">
                  <span>Last name</span>
                  <input
                    type="text"
                    value={lastName}
                    onChange={e => { setLastName(e.target.value); if (error) setError('') }}
                    placeholder="Smith"
                    autoComplete="family-name"
                    maxLength={80}
                  />
                </label>
              </div>

              <label className="asm-field">
                <span>You are a&hellip; (optional)</span>
                <select value={role} onChange={e => setRole(e.target.value)}>
                  <option value="">Prefer not to say</option>
                  {ROLES.map(r => <option key={r} value={r}>{r}</option>)}
                </select>
              </label>

              {error && <p className="asm-err" role="alert">{error}</p>}

              <button type="submit" className="asm-submit" disabled={busy}>
                {busy ? 'Subscribing…' : 'Subscribe'}
              </button>
            </form>

            <button type="button" className="asm-skip" onClick={() => !busy && close(true)}>
              No thanks, keep reading
            </button>
          </>
        )}
      </div>
    </div>
  )
}
