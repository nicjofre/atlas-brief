'use client'

import { useState, useEffect } from 'react'

type State = 'idle' | 'submitting' | 'done' | 'error'

// The "Submit a deal for an operator read" modal. Controlled by `open` so it can
// be triggered from the desktop CTA button and the mobile menu alike.
export default function SubmitDealModal({ open, onClose }: { open: boolean; onClose: () => void }) {
  const [name, setName] = useState('')
  const [email, setEmail] = useState('')
  const [deal, setDeal] = useState('')
  const [note, setNote] = useState('')
  const [state, setState] = useState<State>('idle')
  const [message, setMessage] = useState('')

  // Close on Escape; lock body scroll while open.
  useEffect(() => {
    if (!open) return
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose() }
    document.addEventListener('keydown', onKey)
    const prev = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    return () => {
      document.removeEventListener('keydown', onKey)
      document.body.style.overflow = prev
    }
  }, [open, onClose])

  if (!open) return null

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (state === 'submitting') return
    if (!name.trim()) { setState('error'); setMessage('Please enter your name.'); return }
    if (!email.trim()) { setState('error'); setMessage('Please enter your email.'); return }
    if (!deal.trim()) { setState('error'); setMessage('Please add the deal — an address, link, or short description.'); return }
    setState('submitting')
    setMessage('')
    try {
      const res = await fetch('/api/deals/submit', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name, email, deal, note }),
      })
      const data = await res.json().catch(() => ({}))
      if (!res.ok) { setState('error'); setMessage(data?.error || 'Something went wrong. Please try again.'); return }
      setState('done')
    } catch {
      setState('error'); setMessage('Something went wrong. Please try again.')
    }
  }

  return (
    <div className="deal-overlay" onClick={onClose}>
      <div className="deal-modal" onClick={(e) => e.stopPropagation()} role="dialog" aria-modal="true" aria-label="Submit a deal for an operator read">
        <button type="button" className="deal-close" aria-label="Close" onClick={onClose}>×</button>

        {state === 'done' ? (
          <div className="deal-done">
            <h2>Got it — thank you.</h2>
            <p>David will take a look and get back to you with his read.</p>
            <button type="button" className="nav-primary" onClick={onClose}>Close</button>
          </div>
        ) : (
          <>
            <p className="deal-eyebrow">For an operator read</p>
            <h2 className="deal-title">Submit a deal</h2>
            <p className="deal-sub">
              Send us a deal and David — an active LA owner-operator — will give you his honest read.
            </p>

            <form className="deal-form" onSubmit={onSubmit} noValidate>
              <input className="deal-input" type="text" placeholder="Full name *" aria-label="Full name" value={name} onChange={(e) => setName(e.target.value)} />
              <input className="deal-input" type="email" placeholder="Email address *" aria-label="Email address" value={email} onChange={(e) => setEmail(e.target.value)} />
              <input className="deal-input" type="text" placeholder="The deal — address or listing link *" aria-label="The deal" value={deal} onChange={(e) => setDeal(e.target.value)} />
              <textarea className="deal-input deal-textarea" placeholder="Anything we should know? (optional)" aria-label="Note" rows={3} value={note} onChange={(e) => setNote(e.target.value)} />
              {state === 'error' && <p className="deal-err">{message}</p>}
              <button type="submit" className="nav-primary deal-submit" disabled={state === 'submitting'}>
                {state === 'submitting' ? 'Sending…' : 'Send for a read'}
              </button>
            </form>

            <p className="deal-alt">
              Prefer email? Send the deal to <a href="mailto:David@AtlasBrief.La">David@AtlasBrief.La</a>
            </p>
          </>
        )}
      </div>
    </div>
  )
}
