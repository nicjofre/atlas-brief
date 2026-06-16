import Link from 'next/link'

export default function Footer() {
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
            <p className="m">David@AtlasHomePro.com</p>
          </div>
        </div>
        <div className="footer-legal">
          <span>© MMXXVI Atlas Home Builders, Inc. · CA Class B General Contractor · License [pending]</span>
          <span style={{ fontSize: '0.85em', opacity: 0.7 }}>atlashomepro.com</span>
        </div>
      </div>
    </footer>
  )
}
