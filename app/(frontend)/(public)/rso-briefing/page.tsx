import type { Metadata } from 'next'
import Link from 'next/link'
import BriefingForm from './BriefingForm'
import './rso-briefing.css'

export const metadata: Metadata = {
  title: 'The RSO Intelligence Briefing · Atlas Brief',
  description:
    'The three laws stacked above every LA apartment — state, county, and city — in plain English. What each does, what just changed, and what it costs at the property level. A free briefing from Atlas Brief.',
  openGraph: {
    type: 'article',
    title: 'Death by a thousand cuts — the RSO Intelligence Briefing',
    description:
      'Costa-Hawkins is still standing, but the reset is being ground down through a dozen smaller rules. The three laws above every LA apartment, in plain English.',
    url: '/rso-briefing',
    images: ['/images/rso-briefing-building.png'],
  },
}

// David's RSO Intelligence Briefing landing page. Layout is his; the static
// <form> is swapped for the BriefingForm client component, which posts to the
// same capture-and-email mechanism as the survival guide.
export default function RsoBriefingPage() {
  return (
    <div className="abx">
      <div className="abx-band abx-top">
        <Link href="/" className="abx-logo">Atlas <em>Brief</em></Link>
        <div className="abx-tag">Los Angeles Real Estate</div>
      </div>

      {/* HERO */}
      <div className="abx-band abx-hero">
        <div className="abx-eyebrow abx-hero-eye">Regulatory Intelligence</div>
        <h1>Death by<br />a <em>thousand cuts.</em></h1>
        <p className="abx-hero-sub">Costa-Hawkins is still standing. It survived three repeal votes. <b>The reset is being ground down anyway</b>, through a dozen smaller rules that never make the news.</p>

        <div className="abx-stage">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src="/images/rso-briefing-building.png" alt="A Los Angeles rent-stabilized apartment building" />
          <div className="abx-strata">
            <div className="abx-stratum s-state">
              <span className="lv">Layer 3 · State</span><span className="nm">California</span>
              <span className="fx">AB 1482 · Costa-Hawkins · Ellis</span>
            </div>
            <div className="abx-stratum s-county">
              <span className="lv">Layer 2 · County</span><span className="nm">The reversal</span>
              <span className="fx">Now stricter than the city</span>
            </div>
            <div className="abx-stratum s-city">
              <span className="lv">Layer 1 · City</span><span className="nm">LA RSO</span>
              <span className="fx">Ceiling cut 8% &rarr; 4%</span>
            </div>
          </div>
        </div>
      </div>

      {/* THE EROSION LEDGER */}
      <div className="abx-band abx-ledger">
        <div className="abx-eyebrow">Why the building reprices</div>
        <h2>No single rule ends the business.<br />The <em>sum</em> reprices the asset.</h2>
        <p className="lead">Nobody has to repeal Costa-Hawkins. Read these together and they do exactly what a repeal would do, only slower and without a headline. This is the New York pattern, six years on.</p>

        <div className="abx-cuts">
          <div className="abx-cut"><span className="no">i</span><span className="what">Rent ceiling <span>rewritten, effective July 2026</span></span><span className="amt">8% &rarr; 4%</span></div>
          <div className="abx-cut"><span className="no">ii</span><span className="what">Utility &amp; dependent adders <span>eliminated</span></span><span className="amt">Gone</span></div>
          <div className="abx-cut"><span className="no">iii</span><span className="what">Just cause <span>extended past the pre-1978 line</span></span><span className="amt">Expanded</span></div>
          <div className="abx-cut"><span className="no">iv</span><span className="what">SB 567 <span>made a botched notice a lawsuit</span></span><span className="amt">Liability</span></div>
          <div className="abx-cut"><span className="no">v</span><span className="what">Relocation <span>to turn a single unit</span></span><span className="amt">up to $26,550</span></div>
          <div className="abx-cut"><span className="no">vi</span><span className="what">Measure ULA <span>transfer tax on the exit</span></span><span className="amt">up to 5.5%</span></div>
          <div className="abx-cut total"><span className="no"></span><span className="what">The reset dies in practice, not on paper.</span><span className="amt">Repricing</span></div>
        </div>
      </div>

      {/* CTA */}
      <div className="abx-band abx-cta">
        <div className="abx-cta-grid">
          <div>
            <h3>Read the whole map.<br /><em>Free.</em></h3>
            <p>The three laws stacked above every LA apartment — state, county, and city — in plain English. What each does, what just changed, what it costs at the property level. <b>Every number traces to LAHD, DCBA, or the statute,</b> so you can verify any line.</p>
          </div>
          <BriefingForm />
        </div>
      </div>

      <div className="abx-band abx-foot">
        <div className="fl"><b>The three laws above every LA apartment.</b><br />Current as of July 2026.</div>
        <div className="fr">Sourced to LAHD, DCBA,<br />and the statutes · atlasbrief.la</div>
      </div>
    </div>
  )
}
