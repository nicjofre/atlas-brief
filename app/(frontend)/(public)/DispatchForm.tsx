'use client'

import { useState } from 'react'

// Friday dispatch signup. Posts to /api/subscribe, which stores the address in
// our subscribers table (and mirrors to Resend once that's configured). The
// .sent class drives the CSS swap from form → "You are on the list."
export default function DispatchForm() {
  const [email, setEmail] = useState('')
  const [state, setState] = useState<'idle' | 'submitting' | 'sent' | 'error'>('idle')
  const [error, setError] = useState('')

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (state === 'submitting') return
    setState('submitting')
    setError('')

    try {
      const res = await fetch('/api/subscribe', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email }),
      })
      if (!res.ok) {
        const data = await res.json().catch(() => ({}))
        setError(data?.error || 'Something went wrong. Please try again.')
        setState('error')
        return
      }
      setState('sent')
    } catch {
      setError('Something went wrong. Please try again.')
      setState('error')
    }
  }

  return (
    <form
      className={`tm-dispatch${state === 'sent' ? ' sent' : ''}`}
      onSubmit={onSubmit}
      noValidate
    >
      <span className="tm-d-label">Friday dispatch &mdash; one note per week.</span>
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
        disabled={state === 'submitting'}
      />
      <button type="submit" disabled={state === 'submitting'}>
        {state === 'submitting' ? 'Sending…' : 'Subscribe'}
      </button>
      <span className="tm-d-sent">You are on the list.</span>
      {state === 'error' && (
        <span className="tm-d-err" role="alert">
          {error}
        </span>
      )}
    </form>
  )
}
