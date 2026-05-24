import type { Metadata } from 'next'
import Footer from '../Footer'
import './build.css'

export const metadata: Metadata = {
  title: 'Build · Atlas Home Pro',
  description:
    'Atlas Home Builders, Inc. — a California Class B general contracting practice run by an owner-operator. Los Angeles.',
}

export default function BuildPage() {
  return (
    <>
      <header className="cap-hero">
        <div className="wrap">
          <div className="k">§ Build · Owner-developer-GC practice</div>
          <h1>Build.</h1>
          <div className="grid">
            <div className="meta">
              <b>Discipline</b>
              General contracting<br />
              &amp; in-house trades<br /><br />
              <b>License</b>
              CA Class B<br />
              Atlas Home Builders, Inc.
            </div>
            <div>
              <p><em>Owner-developer-GC practice. Los Angeles. Since 1996.</em></p>
              <p>
                Atlas Home Builders, Inc. is a licensed California Class B general contractor. The practice
                has developed ground-up multifamily and condominium projects, operates its own portfolio of
                roughly 126 units, and takes selective general contracting work for other owners, developers,
                and family offices.
              </p>
              <p>
                We are not a service company. We are a general contracting practice run by an owner-operator
                who has spent thirty years on the owner&apos;s side of the table. Every job we take, we
                underwrite the way an owner would &mdash; because the person running the work has been the
                owner a hundred times over.
              </p>
            </div>
          </div>
        </div>
      </header>

      <section className="trade">
        <div className="wrap">
          <div className="trade-row">
            <span className="n">§</span>
            <div>
              <h2>In-house <em>capabilities.</em></h2>
              <div className="disc">The trades we run ourselves, and the ones we subcontract.</div>
            </div>
            <div className="body">
              <p>
                General contracting, light framing, plumbing rough and trim, electrical rough and trim, HVAC,
                painting, restoration, gates and garage doors. We subcontract anything outside that list to
                people we have worked with for years and will work with for years more.
              </p>
            </div>
          </div>
        </div>
      </section>

      <section className="how">
        <div className="wrap">
          <div className="how-head">
            <div className="num">§ How we work</div>
            <h2>The four-step sequence, the <em>same every job.</em></h2>
          </div>
          <div className="how-grid">
            <div className="how-step">
              <div className="n">Step · 01</div>
              <h4>Walk.</h4>
              <p>
                We walk the project with the owner, the architect, or whoever is running point. No proposal
                yet. We are looking at what the scope actually is, what the building actually needs, where
                the surprises are likely to live. If the project is not a fit, we say so on the walk.
              </p>
            </div>
            <div className="how-step">
              <div className="n">Step · 02</div>
              <h4>Scope &amp; Schedule.</h4>
              <p>
                A real scope document, a real schedule, real line items. Not marketing numbers. If the
                budget needs a conversation about tradeoffs, we have the conversation before the contract.
              </p>
            </div>
            <div className="how-step">
              <div className="n">Step · 03</div>
              <h4>Build.</h4>
              <p>
                We open walls cleanly and close them cleaner. We run the job with the discipline of an
                operator who will have to live with the work for the next twenty years. We do not chase
                change orders.
              </p>
            </div>
            <div className="how-step">
              <div className="n">Step · 04</div>
              <h4>Close Out.</h4>
              <p>
                Permits pulled, inspections signed, closeout binder delivered. The binder is built so an
                operator can pick it up five years from now and understand exactly what was done, by whom,
                and when.
              </p>
            </div>
          </div>
        </div>
      </section>

      <section className="cta">
        <div className="wrap">
          <div className="cta-inner">
            <div>
              <div className="k">Begin a project</div>
              <h2>If you have a project worth running, or a property worth a <em>walk:</em></h2>
              <p style={{ marginTop: 14 }}>
                Email David directly at{' '}
                <a href="mailto:David@AtlasHomePro.com" style={{ color: 'inherit' }}>
                  David@AtlasHomePro.com
                </a>
                . If the project is a fit, we respond within 24 hours. If it is not, we respond within 24
                hours and tell you why.
              </p>
            </div>
            <a href="mailto:David@AtlasHomePro.com" className="btn-w">Email David →</a>
          </div>
        </div>
      </section>

      <Footer />
    </>
  )
}
