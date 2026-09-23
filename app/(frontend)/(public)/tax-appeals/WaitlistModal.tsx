'use client'

import { useEffect, useRef, useState } from 'react'
import WaitlistForm from './WaitlistForm'

// The page closes on one button; the form lives in a dialog behind it. Built on
// <dialog> rather than a hand-rolled overlay so Escape, the backdrop, focus
// containment and inertness of the page behind come from the platform.
export default function WaitlistModal() {
  const ref = useRef<HTMLDialogElement>(null)
  const [open, setOpen] = useState(false)
  const [closing, setClosing] = useState(false)

  function show() {
    setOpen(true)
    setClosing(false)
    ref.current?.showModal()
  }

  // Closing is held for the length of the fade, then the dialog actually
  // closes. Without the wait the element is removed from the top layer on the
  // first frame and there's nothing left to animate.
  function hide() {
    const el = ref.current
    if (!el || closing) return
    const reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches
    if (reduced) {
      el.close()
      return
    }
    setClosing(true)
    window.setTimeout(() => {
      setClosing(false)
      el.close()
    }, 160)
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
    // Escape fires `cancel` and would close on the spot; take it over so it
    // fades out like every other way of dismissing it.
    const onCancel = (e: Event) => {
      e.preventDefault()
      hide()
    }
    el.addEventListener('close', onClose)
    el.addEventListener('cancel', onCancel)
    return () => {
      el.removeEventListener('close', onClose)
      el.removeEventListener('cancel', onCancel)
    }
  })

  return (
    <>
      <button type="button" className="tax-btn tax-btn-primary tax-open" onClick={show}>
        Join the waitlist
      </button>

      <dialog
        ref={ref}
        className={`tax-dialog${closing ? ' is-closing' : ''}`}
        onClick={onClick}
        aria-label="Join the waitlist"
      >
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
