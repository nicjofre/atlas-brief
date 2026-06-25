import Link from 'next/link'

// Social links. Paste the real URLs to switch each icon on — an empty string
// hides that icon (so nothing broken ships before the accounts exist).
//   LinkedIn: David's personal profile (Atlas Brief is his editorial voice)
//   X:        the Atlas Brief account being set up
const LINKEDIN_URL = 'https://www.linkedin.com/in/david-safai-b7622113b/'
const X_URL = '' // Atlas Brief handle — paste to enable once the account is live

export default function Footer() {
  const hasSocial = LINKEDIN_URL || X_URL
  return (
    <footer className="footer">
      <div className="wrap">
        <div className="footer-top">
          <div>
            <div className="footer-logo">Atlas<br />Home Builders, Inc.</div>
            <p className="footer-tag">An owner-builder journal, published from Los Angeles.</p>
          </div>
          <div>
            <h5>Read</h5>
            <ul>
              <li><Link href="/">The Tape</Link></li>
              <li><Link href="/about">About</Link></li>
              <li><Link href="/contact">Contact</Link></li>
            </ul>
          </div>
          <div className="footer-contact">
            <h5>Office</h5>
            <p>Los Angeles, California</p>
            <p className="m" style={{ marginTop: 14 }}>
              <a href="tel:+12132752210">(213) 275-2210</a>
            </p>
            <p className="m">
              <a href="mailto:David@AtlasBrief.La">David@AtlasBrief.La</a>
            </p>
            {hasSocial && (
              <div className="footer-social">
                {LINKEDIN_URL && (
                  <a href={LINKEDIN_URL} target="_blank" rel="noopener noreferrer" aria-label="LinkedIn">
                    <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor" aria-hidden>
                      <path d="M19 3a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h14zM8.34 18.34V9.99H5.67v8.35h2.67zM7 8.81a1.55 1.55 0 1 0 0-3.1 1.55 1.55 0 0 0 0 3.1zm11.34 9.53v-4.58c0-2.45-1.31-3.59-3.06-3.59-1.41 0-2.04.78-2.39 1.33v-1.14h-2.66c.04.75 0 8.35 0 8.35h2.66v-4.66c0-.24.02-.48.09-.65.19-.48.63-.97 1.37-.97.96 0 1.35.73 1.35 1.81v4.47h2.64z" />
                    </svg>
                  </a>
                )}
                {X_URL && (
                  <a href={X_URL} target="_blank" rel="noopener noreferrer" aria-label="X">
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor" aria-hidden>
                      <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24h-6.656l-5.214-6.817-5.966 6.817H1.682l7.73-8.835L1.254 2.25H8.08l4.713 6.231 5.45-6.231zm-1.161 17.52h1.833L7.084 4.126H5.117l11.966 15.644z" />
                    </svg>
                  </a>
                )}
              </div>
            )}
          </div>
        </div>
        <div className="footer-legal">
          <span>© MMXXVI Atlas Home Builders, Inc. · CA Class B General Contractor · License # pending being issued</span>
          <span style={{ fontSize: '0.85em', opacity: 0.7 }}>atlasbrief.la</span>
        </div>
      </div>
    </footer>
  )
}
