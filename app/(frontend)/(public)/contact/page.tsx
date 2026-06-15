import type { Metadata } from 'next'
import Footer from '../Footer'
import { getPageContent } from '@/lib/db/content'
import './contact.css'

export const metadata: Metadata = {
  title: 'Contact · Atlas Home Pro',
  description: 'Atlas Home Builders, Inc. — based in Los Angeles. Editorial, construction, and acquisition inquiries.',
}

export default async function ContactPage() {
  const c = await getPageContent('contact')
  const email = c['contact.direct_email']
  const phone = c['contact.direct_phone']
  // Build tel: href by stripping non-digits, keeping leading +.
  const telHref = `tel:${phone.replace(/[^\d+]/g, '')}`
  return (
    <>
      <header className="c-hero">
        <div className="wrap">
          <div className="k">§ Contact</div>
          <h1>Contact.</h1>
          <p>{c['contact.hero_subtitle']}</p>
        </div>
      </header>

      <section className="c-main">
        <div className="c-form">
          <div className="k">Inquiries</div>
          <h2><strong>For editorial inquiries</strong></h2>
          <p>{c['contact.editorial_body']}</p>
          <h2 style={{ marginTop: 36 }}><strong>For construction or development inquiries</strong></h2>
          <p>{c['contact.construction_body']}</p>
          <h2 style={{ marginTop: 36 }}><strong>For acquisition inquiries</strong></h2>
          <p>{c['contact.acquisition_body']}</p>
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
            <div><dt>Email</dt><dd><a href={`mailto:${email}`}>{email}</a></dd></div>
            <div><dt>Phone</dt><dd><a href={telHref}>{phone}</a></dd></div>
            <div><dt>Office</dt><dd>{c['contact.direct_office']}</dd></div>
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
                  {c['contact.license_status']}
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
