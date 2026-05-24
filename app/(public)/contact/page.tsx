import type { Metadata } from 'next'
import Footer from '../Footer'
import './contact.css'

export const metadata: Metadata = {
  title: 'Contact · Atlas Home Pro',
  description: 'Atlas Home Builders, Inc. — based in Los Angeles. Editorial, construction, and acquisition inquiries.',
}

export default function ContactPage() {
  return (
    <>
      <header className="c-hero">
        <div className="wrap">
          <div className="k">§ Contact</div>
          <h1>Contact.</h1>
          <p>Atlas Home Builders, Inc. is based in Los Angeles.</p>
        </div>
      </header>

      <section className="c-main">
        <div className="c-form">
          <div className="k">Inquiries</div>
          <h2><strong>For editorial inquiries</strong></h2>
          <p>
            If you have a listing, a comp, a trade, or a deal worth covering in The Tape: send it over. We read
            every submission. Interesting deals run in the next issue of the Brief. Uninteresting ones get a
            straight answer back the same day.
          </p>
          <h2 style={{ marginTop: 36 }}><strong>For construction or development inquiries</strong></h2>
          <p>
            If you have a project that needs a general contractor, or a site that needs a walk: describe it in a
            few sentences. If it is a fit, we schedule a walk within the week. If it is not, we tell you why.
          </p>
          <h2 style={{ marginTop: 36 }}><strong>For acquisition inquiries</strong></h2>
          <p>
            If you own a Los Angeles home service business and are thinking about a sale, or a broker
            representing one: we are a buyer. Plumbing, HVAC, electrical, restoration. Conversations are
            confidential. Preferred size $500K to $5M in revenue, but we will read anything that fits the thesis.
          </p>
        </div>

        <aside className="c-side">
          <div className="k">Direct line</div>
          <h3>David Safai</h3>
          <p
            style={{
              fontStyle: 'italic',
              fontSize: 13,
              color: 'var(--muted)',
              marginTop: -8,
              marginBottom: 18,
            }}
          >
            Operator · Developer · GC
          </p>
          <dl>
            <div><dt>Email</dt><dd><a href="mailto:David@AtlasHomePro.com">David@AtlasHomePro.com</a></dd></div>
            <div><dt>Phone</dt><dd><a href="tel:+12132752210">(213) 275-2210</a></dd></div>
            <div><dt>Office</dt><dd>Los Angeles, California</dd></div>
            <div>
              <dt>License</dt>
              <dd>
                CA Class B General Contractor<br />
                <span
                  style={{
                    fontFamily: 'var(--mono)',
                    fontSize: 11,
                    color: 'var(--muted)',
                    letterSpacing: '.1em',
                    textTransform: 'uppercase',
                  }}
                >
                  License [pending]
                </span>
              </dd>
            </div>
          </dl>
        </aside>
      </section>

      <Footer />
    </>
  )
}
