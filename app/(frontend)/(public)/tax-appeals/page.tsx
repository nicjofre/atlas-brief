import type { Metadata } from 'next'
import Link from 'next/link'
import Footer from '../Footer'
import './tax-appeals.css'

export const metadata: Metadata = {
  title: 'Tax Appeals · Atlas Brief',
  description:
    'Atlas Tax Appeals — we find over-assessed LA County multifamily and file the property-tax appeal for you. Income-approach valuation, Decline-in-Value (Prop 8), no savings no fee.',
}

const MAILTO =
  'mailto:David@AtlasBrief.La?subject=Tax%20Appeal%20%E2%80%94%20Assessment%20Review&body=Property%20address(es)%3A%0AParcels%2Funits%3A%0AAnything%20we%20should%20know%3A'

export default function TaxAppealsPage() {
  return (
    <>
      <main className="tax">
        {/* Hero */}
        <header className="tax-hero">
          <div className="tax-wrap">
            <p className="tax-eyebrow">A new service from Atlas · In preview</p>
            <h1 className="tax-h1">
              Your building is almost certainly <em>over-assessed.</em>
            </h1>
            <p className="tax-lede">
              Los Angeles County assesses thousands of multifamily properties above
              what they&rsquo;re actually worth — especially rent-stabilized buildings,
              where the rent ceiling caps value the County&rsquo;s formula ignores.
              Atlas Tax Appeals finds the gap, files the appeal, and gets your
              assessment lowered. You only pay from what you save.
            </p>
            <div className="tax-cta-row">
              <a href={MAILTO} className="tax-btn tax-btn-primary">Request a free review</a>
              <Link href="/contact" className="tax-btn tax-btn-ghost">Talk to David</Link>
            </div>
            <p className="tax-note">
              Preview of a service launching in 2026. The page below shows what it will do.
            </p>
          </div>
        </header>

        {/* The opportunity */}
        <section className="tax-section">
          <div className="tax-wrap tax-two">
            <div className="tax-col-head">
              <span className="tax-kicker">01 — The opportunity</span>
              <h2 className="tax-h2">Most owners never appeal. The big firms won&rsquo;t bother with you.</h2>
            </div>
            <div className="tax-col-body">
              <p>
                Property-tax appeals are a real, legal process — the County has an entire
                Assessment Appeals Board for exactly this. But two things keep money on the table:
              </p>
              <ul className="tax-list">
                <li><strong>Owners don&rsquo;t know it exists.</strong> The assessment notice arrives, the bill gets paid, and nobody questions the number.</li>
                <li><strong>The large tax-appeal firms ignore portfolios under $50M.</strong> The per-filing dollars are too small for them, so small-to-mid multifamily gets no representation.</li>
              </ul>
              <p>
                That&rsquo;s the niche. A streamlined process built for LA owners of
                <strong> 10 to 200 units</strong> — exactly the buildings the market overlooks.
              </p>
            </div>
          </div>
        </section>

        {/* How it works */}
        <section className="tax-section tax-section-alt">
          <div className="tax-wrap">
            <span className="tax-kicker">02 — How it works</span>
            <h2 className="tax-h2 tax-h2-wide">Four steps. We do the work; you keep the savings.</h2>
            <div className="tax-steps">
              <div className="tax-step">
                <span className="tax-step-n">1</span>
                <h3>We run the numbers</h3>
                <p>
                  We pull your parcels and value them the way an investor would — trailing-12
                  NOI divided by a real market cap rate. For rent-stabilized buildings we argue
                  the higher cap rate the rent ceiling justifies. If the math doesn&rsquo;t beat
                  your assessment, we tell you and stop. No wasted filings.
                </p>
              </div>
              <div className="tax-step">
                <span className="tax-step-n">2</span>
                <h3>We file informally first</h3>
                <p>
                  A Decline-in-Value request straight to the Assessor&rsquo;s office — free,
                  no deadline, often resolved in 30&ndash;90 days. Many cases never need to go
                  further than this.
                </p>
              </div>
              <div className="tax-step">
                <span className="tax-step-n">3</span>
                <h3>We file the formal appeal</h3>
                <p>
                  If the informal route stalls, we file the formal application before the
                  November 30 deadline and represent you through the stipulation or hearing —
                  evidence packet, cap-rate argument, comps, all of it.
                </p>
              </div>
              <div className="tax-step">
                <span className="tax-step-n">4</span>
                <h3>You pay from the savings</h3>
                <p>
                  Our fee comes out of what we actually save you. If the assessment
                  doesn&rsquo;t come down, you owe nothing for our work.
                </p>
              </div>
            </div>
          </div>
        </section>

        {/* The math */}
        <section className="tax-section">
          <div className="tax-wrap tax-two">
            <div className="tax-col-head">
              <span className="tax-kicker">03 — What it&rsquo;s worth</span>
              <h2 className="tax-h2">A six-figure reduction is real money, every year.</h2>
            </div>
            <div className="tax-col-body">
              <div className="tax-math">
                <div className="tax-math-row">
                  <span>Assessed value reduction</span>
                  <strong>$300,000</strong>
                </div>
                <div className="tax-math-row">
                  <span>× LA effective tax rate (~1.25%)</span>
                  <strong>≈ $3,750 / yr</strong>
                </div>
                <div className="tax-math-row tax-math-total">
                  <span>And it repeats — Prop 8 is reviewed annually</span>
                  <strong>year after year</strong>
                </div>
              </div>
              <p className="tax-fine">
                Illustrative. Actual savings depend on your building&rsquo;s income, the
                comparable sales, and the cap-rate environment. Some buildings won&rsquo;t
                have room to appeal — and we&rsquo;ll say so before you spend a dollar.
              </p>
            </div>
          </div>
        </section>

        {/* Why Atlas */}
        <section className="tax-section tax-section-alt">
          <div className="tax-wrap">
            <span className="tax-kicker">04 — Why Atlas</span>
            <h2 className="tax-h2 tax-h2-wide">We underwrite LA multifamily for a living.</h2>
            <div className="tax-why">
              <div className="tax-why-item">
                <h3>Owner-operators, not paperwork mills</h3>
                <p>Atlas is an LA owner-operator and general contractor. We value buildings the way the market does, because we buy and build them ourselves.</p>
              </div>
              <div className="tax-why-item">
                <h3>We know the RSO argument cold</h3>
                <p>Rent-stabilized buildings are the strongest appeal cases in LA — and the most misunderstood by the standard formula. It&rsquo;s our home turf.</p>
              </div>
              <div className="tax-why-item">
                <h3>Data-driven from day one</h3>
                <p>The same engine behind Atlas Brief&rsquo;s deal analysis — income, comps, cap rates, assessment history — powers every appeal we build.</p>
              </div>
            </div>
          </div>
        </section>

        {/* Final CTA */}
        <section className="tax-final">
          <div className="tax-wrap tax-final-inner">
            <h2 className="tax-h2">See if your building qualifies.</h2>
            <p>
              Send us the address. We&rsquo;ll run a free first-pass review and tell you
              honestly whether there&rsquo;s an appeal worth filing.
            </p>
            <a href={MAILTO} className="tax-btn tax-btn-primary">Request a free review</a>
          </div>
        </section>
      </main>
      <Footer />
    </>
  )
}
