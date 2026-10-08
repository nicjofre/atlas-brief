'use client'

import Link from 'next/link'
import { useState } from 'react'
import { usePathname } from 'next/navigation'
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
  const isHome = usePathname() === '/'

  return (
    <>
      {isHome ? (
        // The front page gets a paper's flag, modelled on the Washington Post's
        // (2026-10-07): the name once, large and centred, the tagline under it,
        // and the sections in a ruled row beneath. It replaces both the compact
        // bar and the separate masthead the homepage used to stack under it.
        // Not sticky — a flag this tall would eat the screen.
        <header className="mast">
          <div className="mast-inner">
            <h1 className="mast-wordmark"><Link href="/">Atlas <em>Brief</em></Link></h1>
            <p className="mast-tag">A Journal of Los Angeles Real Estate &middot; David Safai, Owner/Operator/Builder</p>
          </div>
          <nav className="mast-nav" aria-label="Sections">
            <button
              className={`nav-burger mast-burger${menuOpen ? ' open' : ''}`}
              aria-label="Menu"
              aria-expanded={menuOpen}
              onClick={() => setMenuOpen(o => !o)}
            >
              <span /><span /><span />
            </button>
            <ul className="mast-links">
              <li><Link href="/atlas-brief/sections/broker-activity">The Tape</Link></li>
              <li><Link href="/atlas-brief/dispatch">Dispatch</Link></li>
              <li><Link href="/about">About</Link></li>
              <li><Link href="/contact">Contact</Link></li>
              <li className="mast-sep" aria-hidden="true" />
              <li className="mast-work"><Link href="/contact">Work with Atlas</Link></li>
            </ul>
          </nav>
          {/* Top corner, where the Post keeps its account buttons, so the
              section row and its rule run the full width under the name. */}
          <Link href="/subscribe" className="nav-highlight mast-subscribe">Subscribe</Link>
        </header>
      ) : (
      <nav className="nav">
        <div className="nav-inner">
          {/* Lockup = roundel + wordmark + tracked tagline, per the identity sheet.
              One grid cell so the nav stays a 3-column layout. */}
          <div className="nav-lockup">
            <Link href="/" className="nav-logo" onClick={closeMenu}><AtlasMark /><span className="nav-wordmark">Atlas <em>Brief</em></span></Link>
            <span className="nav-tagline" aria-hidden="true">Los Angeles<br />Real Estate<br />Intelligence</span>
          </div>
          <ul className="nav-links">
            {/* One entry per stream. "The Tape" is the deals page — it used to
                point at the homepage, which meant the same words led to two
                different places depending on where you clicked. */}
            <li><Link href="/atlas-brief/sections/broker-activity">The Tape</Link></li>
            <li><Link href="/atlas-brief/dispatch">Dispatch</Link></li>
            <li><Link href="/about">About</Link></li>
            <li><Link href="/contact">Contact</Link></li>
          </ul>
          <div className="nav-right">
            {/* Tertiary → secondary → primary, ascending in prominence toward the edge. */}
            <Link href="/contact" className="nav-tertiary">Work with Atlas</Link>
            {/* Tax Appeals is on hold, so the slot goes to the thing we always
                want asked for. /tax-appeals still exists, just unlinked. */}
            {/* Goes to /subscribe (2026-09-29). It used to fire
                `atlas:open-subscribe` for the pop-up; the in-article Subscribe
                buttons still do, so the layout's pop-up stays mounted. */}
            <Link href="/subscribe" className="nav-highlight">
              Subscribe
            </Link>
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
      )}

      {/* Mobile menu — editorial links. Tax Appeals stays pinned to the top bar,
          so it's not repeated here. */}
      <div className={`mobile-menu${menuOpen ? ' open' : ''}`}>
        <ul>
          <li><Link href="/atlas-brief/sections/broker-activity" onClick={closeMenu}>The Tape</Link></li>
          <li><Link href="/atlas-brief/dispatch" onClick={closeMenu}>Dispatch</Link></li>
          <li><Link href="/about" onClick={closeMenu}>About</Link></li>
          <li><Link href="/contact" onClick={closeMenu}>Contact</Link></li>
          <li><Link href="/contact" onClick={closeMenu}>Work with Atlas</Link></li>
        </ul>
      </div>

    </>
  )
}
