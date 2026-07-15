'use client'

import { useState } from 'react'
import { trackConversion, CONVERSIONS } from '@/lib/analytics/conversions'

const PDF_URL = '/atlas-survival-guide.pdf'
type State = 'idle' | 'submitting' | 'done' | 'error'

export default function GuideForm() {
  const [name, setName] = useState('')
  const [email, setEmail] = useState('')
  const [company, setCompany] = useState('')
  const [state, setState] = useState<State>('idle')
  const [message, setMessage] = useState('')

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
        body: JSON.stringify({ name, email, company }),
      })
      const data = await res.json().catch(() => ({}))
      if (!res.ok) { setState('error'); setMessage(data?.error || 'Something went wrong. Please try again.'); return }
      trackConversion(CONVERSIONS.whitePaper)
      setState('done')
      // Kick off the download immediately.
      if (typeof window !== 'undefined') window.open(PDF_URL, '_blank', 'noopener')
    } catch {
      setState('error'); setMessage('Something went wrong. Please try again.')
    }
  }

  if (state === 'done') {
    return (
      <div className="sg-done">
        <strong>Your guide is ready.</strong>
        <span>The download should have opened in a new tab. If it didn&rsquo;t:</span>
        <a href={PDF_URL} target="_blank" rel="noopener noreferrer" className="sg-btn sg-btn-primary">Download the guide (PDF)</a>
      </div>
    )
  }

  return (
    <form className="sg-form" onSubmit={onSubmit} noValidate>
      <input className="sg-input" type="text" placeholder="Full name *" aria-label="Full name"
        value={name} onChange={(e) => setName(e.target.value)} />
      <input className="sg-input" type="email" placeholder="Email address *" aria-label="Email address"
        value={email} onChange={(e) => setEmail(e.target.value)} />
      <input className="sg-input" type="text" placeholder="Company (optional)" aria-label="Company"
        value={company} onChange={(e) => setCompany(e.target.value)} />
      {state === 'error' && <p className="sg-err">{message}</p>}
      <button type="submit" className="sg-btn sg-btn-primary" disabled={state === 'submitting'}>
        {state === 'submitting' ? 'Sending…' : 'Get the guide'}
      </button>
      <p className="sg-fine">Free. One email, no spam. Unsubscribe anytime.</p>
    </form>
  )
}
