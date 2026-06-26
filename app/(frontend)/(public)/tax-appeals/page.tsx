import type { Metadata } from 'next'
import Footer from '../Footer'
import WaitlistForm from './WaitlistForm'
import './tax-appeals.css'

export const metadata: Metadata = {
  title: 'Tax Appeals · Atlas Brief',
  description:
    'Atlas Tax Appeals — we find over-assessed LA County multifamily and file the property-tax appeal for you, at a fraction of what the big firms charge. Join the waitlist.',
}

export default function TaxAppealsPage() {
  return (
    <>
      <main className="tax">
        <header className="tax-hero">
          <div className="tax-wrap">
            <p className="tax-eyebrow">A new service from Atlas · In preview</p>
            <h1 className="tax-h1">
              Your building is almost certainly <em>over-assessed.</em>
            </h1>
            <p className="tax-lede">
              LA County over-assesses thousands of multifamily properties — especially
              rent-stabilized ones. Atlas finds the gap, files the appeal, and gets your
              assessment lowered, for a small fraction of what traditional tax-appeal firms charge.
            </p>

            <p className="tax-price">
              The big firms take <mark className="tax-mark">25–40% of your first-year savings.</mark>{' '}
              We&rsquo;re building this to cost <mark className="tax-mark">up to a tenth of that.</mark>
            </p>

            <div className="tax-steps">
              <span><b>1.</b> We run the numbers — free</span>
              <span><b>2.</b> We file the appeal</span>
              <span><b>3.</b> You only pay from the savings</span>
            </div>

            <div className="tax-cta-row">
              <WaitlistForm />
            </div>
            <p className="tax-note">Launching 2026. Join the list to be first in line.</p>
          </div>
        </header>
      </main>
      <Footer />
    </>
  )
}
