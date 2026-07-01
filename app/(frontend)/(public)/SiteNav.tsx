'use client'

import Link from 'next/link'
import { useState } from 'react'
import SubmitDealModal from './SubmitDealModal'

// The public site header. Client component so the hamburger menu and the deal
// modal are interactive. Desktop: editorial links centered, CTA cluster right
// (Work with Atlas / Tax Appeals / Submit a Deal). Mobile: burger + centered
// logo + Tax Appeals; everything else lives in the hamburger menu.
export default function SiteNav() {
  const [menuOpen, setMenuOpen] = useState(false)
  const [dealOpen, setDealOpen] = useState(false)
  const closeMenu = () => setMenuOpen(false)

  return (
    <>
      <nav className="nav">
        <div className="nav-inner">
          <Link href="/" className="nav-logo" onClick={closeMenu}><span className="mark" /> Atlas <em>Brief</em></Link>
          <ul className="nav-links">
            <li><Link href="/">The Tape</Link></li>
            <li><Link href="/about">About</Link></li>
            <li><Link href="/contact">Contact</Link></li>
          </ul>
          <div className="nav-right">
            {/* Tertiary → secondary → primary, ascending in prominence toward the edge. */}
            <Link href="/contact" className="nav-tertiary">Work with Atlas</Link>
            <Link href="/tax-appeals" className="nav-highlight">Tax Appeals<span className="nav-highlight-tag">New</span></Link>
            <button type="button" className="nav-primary" onClick={() => setDealOpen(true)}>Submit a Deal</button>
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

      {/* Mobile menu — editorial links. Tax Appeals + Submit a Deal stay pinned
          to the top bar, so they're not repeated here. */}
      <div className={`mobile-menu${menuOpen ? ' open' : ''}`}>
        <ul>
          <li><Link href="/" onClick={closeMenu}>The Tape</Link></li>
          <li><Link href="/about" onClick={closeMenu}>About</Link></li>
          <li><Link href="/contact" onClick={closeMenu}>Contact</Link></li>
          <li><Link href="/contact" onClick={closeMenu}>Work with Atlas</Link></li>
        </ul>
      </div>

      <SubmitDealModal open={dealOpen} onClose={() => setDealOpen(false)} />
    </>
  )
}
