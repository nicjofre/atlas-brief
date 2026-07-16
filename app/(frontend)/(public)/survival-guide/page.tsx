import type { Metadata } from 'next'
import Footer from '../Footer'
import GuideForm from './GuideForm'
import './survival-guide.css'

export const metadata: Metadata = {
  title: 'The Atlas Brief Survival Guide · Atlas Brief',
  description:
    'How apartment investors protect their equity through every market cycle. A free guide from Atlas Brief — the framework, the blow-ups to avoid, and the one variable that decides your return.',
}

const INSIDE = [
  ['The 11 ways investors blow themselves up', 'A plain checklist of the balance-sheet mistakes that wipe out equity — from negative leverage to running out of liquidity.'],
  ['The Atlas Brief Survival Framework', 'Ten boring, unglamorous rules that survive every cycle. Positive leverage, in-place income, and the endgame most owners forget.'],
  ['The Four Worlds test', 'Rates fall or stay high, rules hold or tighten. If your deal only works in one world, it isn’t a deal — it’s a bet.'],
  ['Pricing the risks that quietly destroy equity', 'Insurance shocks, property taxes, deferred maintenance, rent control, evictions — how to price them instead of fearing them.'],
  ['The single biggest variable in your return', 'Why RSO status is the one line that decides everything, and how to underwrite it honestly.'],
]

export default function SurvivalGuidePage() {
  return (
    <>
      <main className="sg">
        <section className="sg-hero">
          <div className="sg-wrap sg-hero-grid">
            <div className="sg-hero-copy">
              <p className="sg-eyebrow">Atlas Brief · Free guide</p>
              <h1 className="sg-h1">
                One bad deal can undo <em>ten good years.</em>
              </h1>
              <p className="sg-lede">
                Most apartment blow-ups trace back to the same thing: too much debt meeting a bad year. This
                guide is the underwriting discipline that keeps a rough year from becoming a forced sale &mdash;
                the rules, the risks to price in, and the test every deal has to pass.
              </p>
              <p className="sg-kicker">
                Written by David Safai, after buying and holding through multiple LA cycles.
              </p>
            </div>

            <div className="sg-card">
              <div className="sg-card-head">Get the guide</div>
              <p className="sg-card-sub">Enter your details and the PDF is yours instantly.</p>
              <GuideForm />
            </div>
          </div>
        </section>

        <section className="sg-inside">
          <div className="sg-wrap">
            <span className="sg-section-kicker">What&rsquo;s inside</span>
            <div className="sg-inside-grid">
              {INSIDE.map(([title, body], i) => (
                <div className="sg-inside-item" key={i}>
                  <span className="sg-num">{String(i + 1).padStart(2, '0')}</span>
                  <div>
                    <h3>{title}</h3>
                    <p>{body}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </section>

      </main>
      <Footer />
    </>
  )
}
