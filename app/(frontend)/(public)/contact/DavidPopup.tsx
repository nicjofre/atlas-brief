'use client'

import { useRef } from 'react'

// "Rather message us?" is a button that brings up David's details in a pop-up
// (Lucas, 2026-11-23). Replaces the navy band that slid up over the titles and
// form (ContactReveal.tsx, now unused). The pop-up is set like the Friday
// Dispatch email (Lucas's screenshot): white panel, red rule along the top,
// the Atlas Brief wordmark over a grey line, a hairline, then one entry with
// David's details on the left and his photo on the right.
// A native <dialog>: Esc closes it, focus stays inside, the page behind dims.
// Clicking outside the panel or the × closes it too. Styles: contact.css .c-pop.

type David = {
  name?: string | null
  role?: string | null
  email?: string | null
  phone?: string | null
  office?: string | null
  licenseStatus?: string | null
}

export default function DavidPopup({ david }: { david: David }) {
  const ref = useRef<HTMLDialogElement>(null)
  const telHref = `tel:${(david.phone || '').replace(/[^\d+]/g, '')}`
  const close = () => ref.current?.close()

  return (
    <section className="c-ask">
      <button type="button" className="c-ask-btn" onClick={() => ref.current?.showModal()}>
        Rather message us?
      </button>

      <dialog
        ref={ref}
        className="c-pop"
        aria-labelledby="c-pop-name"
        // A click on the dialog itself (not the panel inside) is the backdrop.
        onClick={(e) => { if (e.target === e.currentTarget) close() }}
      >
        <div className="c-pop-panel">
          <button type="button" className="c-pop-x" onClick={close} aria-label="Close">
            <svg viewBox="0 0 24 24" width="20" height="20" aria-hidden="true">
              <path d="M6 6l12 12M18 6L6 18" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
            </svg>
          </button>

          <header className="c-pop-head">
            <div className="c-pop-mark">Atlas <span>Brief</span></div>
            <div className="c-pop-sub">Contact</div>
          </header>

          <div className="c-pop-entry">
            <div className="c-pop-text">
              <div className="c-pop-kicker">
                {david.office && <span className="c-pop-place">{david.office.split(',')[0]}</span>}
                {david.licenseStatus && <span className="c-pop-tag">{david.licenseStatus}</span>}
              </div>
              <h2 id="c-pop-name">{david.name || 'David Safai'}</h2>
              {david.role && <p>{david.role.replace(/ · /g, ', ')}</p>}
              <p>
                {david.email && <a href={`mailto:${david.email}`}>{david.email}</a>}
                {david.email && david.phone && <br />}
                {david.phone && <a href={telHref}>{david.phone}</a>}
              </p>
              {david.licenseStatus && <p>CA Class B General Contractor</p>}
            </div>
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img className="c-pop-photo" src="/images/david-safai.jpg" alt={david.name || 'David Safai'} width={637} height={720} />
          </div>
        </div>
      </dialog>
    </section>
  )
}
