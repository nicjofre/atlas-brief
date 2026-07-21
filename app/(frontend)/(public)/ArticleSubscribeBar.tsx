'use client'

import { useEffect, useState } from 'react'
import { captureSuppressed, markSubscribed, markCaptureDismissed } from '@/lib/subscribe-flag'

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/

// A thin subscribe bar that reveals once the reader has scrolled into the
// article, then stays pinned. Hidden at the very top so it doesn't fight the
// masthead. Suppressed for anyone who's already subscribed or dismissed it.
export default function ArticleSubscribeBar() {
  const [mounted, setMounted] = useState(false)
  const [suppressed, setSuppressed] = useState(true)
  const [scrolledIn, setScrolledIn] = useState(false)
  const [email, setEmail] = useState('')
  const [status, setStatus] = useState<'idle' | 'loading' | 'done' | 'error'>('idle')
  const [err, setErr] = useState<string | null>(null)

  useEffect(() => {
    setMounted(true)
    setSuppressed(captureSuppressed())
    const onScroll = () => setScrolledIn(window.scrollY > 520)
    onScroll()
    window.addEventListener('scroll', onScroll, { passive: true })
    return () => window.removeEventListener('scroll', onScroll)
  }, [])

  // After a successful signup, hold the confirmation briefly, then retire.
  useEffect(() => {
    if (status !== 'done') return
    const t = setTimeout(() => setSuppressed(true), 2600)
    return () => clearTimeout(t)
  }, [status])

  if (!mounted || suppressed) return null

  async function submit(e: React.FormEvent) {
    e.preventDefault()
    if (!EMAIL_RE.test(email.trim())) { setErr('Enter a valid email.'); setStatus('error'); return }
    setStatus('loading'); setErr(null)
    try {
      const res = await fetch('/api/subscribe', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: email.trim(), source: 'article_bar' }),
      })
      const data = await res.json().catch(() => ({}))
      if (!res.ok) throw new Error(data.error || 'Something went wrong.')
      markSubscribed()
      setStatus('done')
    } catch (e) {
      setErr(e instanceof Error ? e.message : 'Something went wrong.')
      setStatus('error')
    }
  }

  function dismiss() {
    markCaptureDismissed()
    setSuppressed(true)
  }

  const visible = scrolledIn

  return (
    <div
      style={{
        position: 'fixed', top: 0, left: 0, right: 0, zIndex: 200,
        transform: visible ? 'translateY(0)' : 'translateY(-100%)',
        transition: 'transform 0.28s ease',
        background: '#0A0A0A', color: '#FFF4E3',
        borderBottom: '1px solid #8B5A2B',
        boxShadow: '0 1px 12px rgba(0,0,0,0.25)',
      }}
    >
      <div style={{ maxWidth: 1180, margin: '0 auto', padding: '9px 16px', display: 'flex', alignItems: 'center', gap: 14, flexWrap: 'wrap' }}>
        {status === 'done' ? (
          <span style={{ fontFamily: "Newsreader, Georgia, serif", fontSize: 15 }}>
            You&rsquo;re on the list. Talk Friday.
          </span>
        ) : (
          <>
            <span style={{ fontFamily: "Newsreader, Georgia, serif", fontSize: 15, lineHeight: 1.2, flex: '1 1 220px' }}>
              Get the Friday Dispatch — one operator&rsquo;s read on LA multifamily, weekly.
            </span>
            <form onSubmit={submit} style={{ display: 'flex', alignItems: 'center', gap: 8, flex: '0 1 auto' }}>
              <input
                type="email"
                value={email}
                onChange={e => { setEmail(e.target.value); if (status === 'error') setStatus('idle') }}
                placeholder="you@email.com"
                aria-label="Email address"
                style={{
                  padding: '7px 11px', fontSize: 14, minWidth: 200, border: '1px solid #8B5A2B',
                  background: '#FFFDF7', color: '#0A0A0A', borderRadius: 3, fontFamily: 'ui-monospace, Menlo, monospace',
                }}
              />
              <button
                type="submit"
                disabled={status === 'loading'}
                style={{
                  padding: '8px 16px', fontSize: 11, letterSpacing: '0.14em', textTransform: 'uppercase',
                  background: '#8B5A2B', color: '#FFF4E3', border: 'none', borderRadius: 3, cursor: 'pointer',
                  fontFamily: 'ui-monospace, Menlo, monospace', whiteSpace: 'nowrap',
                }}
              >
                {status === 'loading' ? 'Adding…' : 'Subscribe'}
              </button>
            </form>
            {err && <span style={{ fontSize: 12, color: '#F2B8B5', fontFamily: 'ui-monospace, Menlo, monospace' }}>{err}</span>}
            <button
              onClick={dismiss}
              aria-label="Dismiss"
              style={{ background: 'none', border: 'none', color: '#C9B79F', fontSize: 20, lineHeight: 1, cursor: 'pointer', padding: '0 4px', marginLeft: 'auto' }}
            >
              ×
            </button>
          </>
        )}
      </div>
    </div>
  )
}
