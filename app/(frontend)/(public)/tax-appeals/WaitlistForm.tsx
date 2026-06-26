'use client'

import { useState } from 'react'

type State = 'idle' | 'submitting' | 'done' | 'error'

export default function WaitlistForm() {
  const [email, setEmail] = useState('')
  const [name, setName] = useState('')
  const [property, setProperty] = useState('')
  const [state, setState] = useState<State>('idle')
  const [message, setMessage] = useState('')

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (state === 'submitting') return
    setState('submitting')
    setMessage('')
    try {
      const res = await fetch('/api/tax-appeals/waitlist', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, name, property }),
      })
      const data = await res.json().catch(() => ({}))
      if (!res.ok) {
        setState('error')
        setMessage(data?.error || 'Something went wrong. Please try again.')
        return
      }
      setState('done')
    } catch {
      setState('error')
      setMessage('Something went wrong. Please try again.')
    }
  }

  if (state === 'done') {
    return (
      <div className="tax-form-done">
        <strong>You&rsquo;re on the list.</strong>
        <span>We&rsquo;ll reach out as the service goes live.</span>
      </div>
    )
  }

  return (
    <form className="tax-form" onSubmit={onSubmit} noValidate>
      <div className="tax-form-row">
        <input
          type="email"
          required
          placeholder="Email address *"
          aria-label="Email address"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          className="tax-input"
        />
        <button type="submit" className="tax-btn tax-btn-primary" disabled={state === 'submitting'}>
          {state === 'submitting' ? 'Joining…' : 'Join the waitlist'}
        </button>
      </div>
      <div className="tax-form-row">
        <input
          type="text"
          placeholder="Name (optional)"
          aria-label="Name"
          value={name}
          onChange={(e) => setName(e.target.value)}
          className="tax-input"
        />
        <input
          type="text"
          placeholder="Property address (optional)"
          aria-label="Property address"
          value={property}
          onChange={(e) => setProperty(e.target.value)}
          className="tax-input"
        />
      </div>
      {state === 'error' && <p className="tax-form-err">{message}</p>}
    </form>
  )
}
