import Link from 'next/link'
import type { Metadata } from 'next'
import SubmitDealButton from './SubmitDealButton'
import './atlas-v2.css'

export const metadata: Metadata = {
  title: 'Atlas Brief',
  description: 'An owner-builder journal of Los Angeles real estate, development, and policy.',
  icons: {
    icon: [
      { url: '/favicon.svg', type: 'image/svg+xml' },
      { url: '/favicon-32.png', sizes: '32x32', type: 'image/png' },
    ],
    apple: '/apple-touch-icon.png',
  },
}

// David's atlas-v2.css uses `@import url('https://fonts.googleapis.com/...')` at the top to
// load Newsreader / Inter Tight / JetBrains Mono. Next.js's CSS bundler strips that @import
// from imported stylesheets, so the page falls back to Times. We re-add the same fonts as a
// stylesheet link here. (Migrate to next/font later if FOUT becomes a problem.)
const GOOGLE_FONTS_URL =
  'https://fonts.googleapis.com/css2?' +
  'family=Newsreader:ital,opsz,wght@0,6..72,300;0,6..72,400;0,6..72,500;0,6..72,600;0,6..72,700;1,6..72,400;1,6..72,500' +
  '&family=Inter+Tight:wght@300;400;500;600;700' +
  '&family=JetBrains+Mono:wght@400;500;600' +
  '&display=swap'

export default function PublicLayout({ children }: { children: React.ReactNode }) {
  return (
    <>
      <link rel="preconnect" href="https://fonts.googleapis.com" />
      <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="" />
      <link rel="stylesheet" href={GOOGLE_FONTS_URL} />

      <nav className="nav">
        <div className="nav-inner">
          <Link href="/" className="nav-logo"><span className="mark" /> Atlas <em>Brief</em></Link>
          <ul className="nav-links">
            <li><Link href="/">The Tape</Link></li>
            <li><Link href="/about">About</Link></li>
            <li><Link href="/contact">Contact</Link></li>
          </ul>
          <div className="nav-right">
            {/* Tertiary → secondary → primary, ascending in prominence toward the edge. */}
            <Link href="/contact" className="nav-tertiary">Work with Atlas</Link>
            <Link href="/tax-appeals" className="nav-highlight">Tax Appeals<span className="nav-highlight-tag">New</span></Link>
            <SubmitDealButton />
            <button className="nav-burger" aria-label="Menu"><span /><span /><span /></button>
          </div>
        </div>
      </nav>

      <div id="atlas-ticker" />

      {children}
    </>
  )
}
