import type { Metadata } from 'next'
import Footer from '../Footer'
import { getPageContent } from '@/lib/db/content'
import './build.css'

export const metadata: Metadata = {
  title: 'Build · Atlas Home Pro',
  description:
    'Atlas Home Builders, Inc. — a California Class B general contracting practice run by an owner-operator. Los Angeles.',
}

export default async function BuildPage() {
  const c = await getPageContent('build')
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
              <p>{c['build.intro_p1']}</p>
              <p>{c['build.intro_p2']}</p>
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
              <p>{c['build.in_house_body']}</p>
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
              <p>{c['build.step1_body']}</p>
            </div>
            <div className="how-step">
              <div className="n">Step · 02</div>
              <h4>Scope &amp; Schedule.</h4>
              <p>{c['build.step2_body']}</p>
            </div>
            <div className="how-step">
              <div className="n">Step · 03</div>
              <h4>Build.</h4>
              <p>{c['build.step3_body']}</p>
            </div>
            <div className="how-step">
              <div className="n">Step · 04</div>
              <h4>Close Out.</h4>
              <p>{c['build.step4_body']}</p>
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
              <p style={{ marginTop: 14 }}>{c['build.cta_body']}</p>
            </div>
            <a href="mailto:David@AtlasHomePro.com" className="btn-w">Email David →</a>
          </div>
        </div>
      </section>

      <Footer />
    </>
  )
}
