'use client'

import { useEffect, useRef, useState } from 'react'
import WaitlistForm from './WaitlistForm'

// The page closes on one button; the form lives in a dialog behind it. Built on
// <dialog> rather than a hand-rolled overlay so Escape, the backdrop, focus
// containment and inertness of the page behind come from the platform.
export default function WaitlistModal() {
  const ref = useRef<HTMLDialogElement>(null)
  const [open, setOpen] = useState(false)

  function show() {
    setOpen(true)
    ref.current?.showModal()
  }

  function hide() {
    ref.current?.close()
  }

  // Clicking the backdrop closes it. The dialog's own box is the only child, so
  // a click landing on <dialog> itself is a click outside the card.
  function onClick(e: React.MouseEvent<HTMLDialogElement>) {
    if (e.target === ref.current) hide()
  }

  // Keep React's state in step when the platform closes it (Escape, backdrop).
  useEffect(() => {
    const el = ref.current
    if (!el) return
    const onClose = () => setOpen(false)
    el.addEventListener('close', onClose)
    return () => el.removeEventListener('close', onClose)
  }, [])

  return (
    <>
      <button type="button" className="tax-btn tax-btn-primary tax-open" onClick={show}>
        Join the waitlist
      </button>

      <dialog ref={ref} className="tax-dialog" onClick={onClick} aria-label="Join the waitlist">
        <div className="tax-dialog-card">
          <button type="button" className="tax-dialog-x" onClick={hide} aria-label="Close">
            &times;
          </button>
          <p className="tax-dialog-kicker">Atlas Tax Appeals</p>
          <h2 className="tax-dialog-hed">Join the waitlist</h2>
          <p className="tax-dialog-sub">
            We run the numbers free. You only pay from the savings.
          </p>
          {/* Remounted each time it opens, so a previous "you're on the list"
              doesn't greet the next person who opens it. */}
          {open && <WaitlistForm />}
        </div>
      </dialog>
    </>
  )
}
