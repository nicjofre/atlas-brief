'use client'

import Link from 'next/link'
import { useState } from 'react'
import AtlasMark from './AtlasMark'

// The public site header. Client component so the hamburger menu is interactive.
// Desktop: editorial links centered, CTA cluster right (Work with Atlas / Tax
// Appeals). Mobile: burger + centered logo + Tax Appeals; everything else lives
// in the hamburger menu.
//
// The "Submit a Deal" CTA was pulled 2026-09-09 — it was drawing spam. Only the
// entry point is gone: SubmitDealModal.tsx, POST /api/deals/submit, the
// deal_submissions table and the notification email are all untouched, so
// restoring it is re-importing the modal, re-adding the dealOpen state, the
// button below the Tax Appeals link, and <SubmitDealModal /> before the closing
// fragment — and set DEALS_ENABLED=1, or the route will 404 the submission.
export default function SiteNav() {
  const [menuOpen, setMenuOpen] = useState(false)
  const closeMenu = () => setMenuOpen(false)

  return (
    <>
      <nav className="nav">
        <div className="nav-inner">
          {/* Lockup = roundel + wordmark + tracked tagline, per the identity sheet.
              One grid cell so the nav stays a 3-column layout. */}
          <div className="nav-lockup">
            <Link href="/" className="nav-logo" onClick={closeMenu}><AtlasMark /><span className="nav-wordmark">Atlas <em>Brief</em></span></Link>
            <span className="nav-tagline" aria-hidden="true">Los Angeles<br />Real Estate<br />Intelligence</span>
          </div>
          <ul className="nav-links">
            <li><Link href="/">The Tape</Link></li>
            {/* The only section with entries today, and where every article's
                "Back to Board" lands — previously reachable only from inside
                an article. */}
            <li><Link href="/atlas-brief/sections/broker-activity">Broker Activity</Link></li>
            <li><Link href="/about">About</Link></li>
            <li><Link href="/contact">Contact</Link></li>
          </ul>
          <div className="nav-right">
            {/* Tertiary → secondary → primary, ascending in prominence toward the edge. */}
            <Link href="/contact" className="nav-tertiary">Work with Atlas</Link>
            <Link href="/tax-appeals" className="nav-highlight">Tax Appeals<span className="nav-highlight-tag">New</span></Link>
            <button
              className={`nav-burger${menuOpen ? ' open' : ''}`}
              aria-label="Menu"
              aria-expanded={menuOpen}
              onClick={() => setMenuOpen(o => !o)}
            >
              <span /><span /><span />
            </button>
          </div>
        </div>
      </nav>

      {/* Mobile menu — editorial links. Tax Appeals stays pinned to the top bar,
          so it's not repeated here. */}
      <div className={`mobile-menu${menuOpen ? ' open' : ''}`}>
        <ul>
          <li><Link href="/" onClick={closeMenu}>The Tape</Link></li>
          <li><Link href="/about" onClick={closeMenu}>About</Link></li>
          <li><Link href="/contact" onClick={closeMenu}>Contact</Link></li>
          <li><Link href="/contact" onClick={closeMenu}>Work with Atlas</Link></li>
        </ul>
      </div>

    </>
  )
}
