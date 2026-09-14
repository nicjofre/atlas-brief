import type { Metadata } from 'next'
import { pageMetadata } from '@/lib/seo/metadata'
import Footer from '../Footer'
import WaitlistForm from './WaitlistForm'
import './tax-appeals.css'

export const metadata: Metadata = pageMetadata({
  title: 'Tax Appeals · Atlas Brief',
  description:
    'Atlas Tax Appeals — we find over-assessed LA County multifamily and file the property-tax appeal for you, at a fraction of what the big firms charge. Join the waitlist.',
  path: '/tax-appeals',
})

// Outline icons from the comp: a filed document, an owner, a rising value.
// Drawn inline rather than shipped as assets — three 24px line drawings don't
// earn a sprite, and as SVG they take the red from currentColor.
function IconFile() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6"
         strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="M14 3H7a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2V8z" />
      <path d="M14 3v5h5" />
      <path d="M12 11v6" />
      <path d="M9.5 14.5 12 17l2.5-2.5" />
    </svg>
  )
}

function IconOwner() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6"
         strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <circle cx="12" cy="8" r="3.4" />
      <path d="M5 20a7 7 0 0 1 14 0" />
    </svg>
  )
}

function IconValue() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6"
         strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <circle cx="12" cy="12" r="9" />
      <path d="M9.3 9.2a2.8 2.8 0 1 1 3.4 3.3c-.5.2-.8.7-.8 1.2v.5" />
      <path d="M12 17.2h.01" />
    </svg>
  )
}

export default function TaxAppealsPage() {
  return (
    <>
      <main className="tax">
        {/* Hero on the identity sheet's pattern: photo under a navy wash, red
            kicker, the service name large, a short red rule, then the promise.
            PLACEHOLDER photo — the sheet calls for the LA skyline, which has
            never existed in public/; the homepage masthead stands in with the
            same shot. Swap both when the asset lands. */}
        <header className="tax-hero">
          <div className="tax-hero-photo" aria-hidden="true" />
          <div className="tax-wrap tax-hero-inner">
            <p className="tax-eyebrow">Property Tax</p>
            <h1 className="tax-h1">Tax Appeals</h1>
            <p className="tax-lede">Lower your property taxes. Keep more of what you earn.</p>
          </div>
        </header>

        <section className="tax-three">
          <div className="tax-wrap">
            <div className="tax-cols">
              <div className="tax-col">
                <span className="tax-ico"><IconFile /></span>
                <h2>What We Do</h2>
                <p>
                  Review assessments, file appeals, and manage the process from start to
                  finish. LA County over-assesses thousands of multifamily properties —
                  rent-stabilized ones especially. We find the gap and argue it.
                </p>
              </div>
              <div className="tax-col">
                <span className="tax-ico"><IconOwner /></span>
                <h2>Who It&rsquo;s For</h2>
                <p>
                  Owners of commercial, multifamily, and residential property in Los
                  Angeles County — whether you hold one building or a portfolio.
                </p>
              </div>
              <div className="tax-col">
                <span className="tax-ico"><IconValue /></span>
                <h2>Why It Matters</h2>
                <p>
                  Lower taxes improve cash flow and increase long-term value. An
                  assessment left unchallenged compounds against you every year you hold.
                </p>
              </div>
            </div>
          </div>
        </section>

        <section className="tax-offer">
          <div className="tax-wrap">
            <p className="tax-price">
              The big firms take <mark className="tax-mark">25&ndash;40% of your first-year savings.</mark>{' '}
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
        </section>
      </main>
      <Footer />
    </>
  )
}
