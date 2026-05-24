import type { Metadata } from 'next'
import Footer from '../Footer'
import './about.css'

export const metadata: Metadata = {
  title: 'About · Atlas Home Pro',
  description:
    'Atlas is a Los Angeles real estate practice with three sides: Atlas Brief (publication), Atlas Home Builders, Inc. (general contractor), and Atlas Home Pro (acquisitions).',
}

export default function AboutPage() {
  return (
    <>
      <header className="ab-top">
        <div className="wrap">
          <div className="eyebrow">§ About</div>
          <h1>About.</h1>
        </div>
      </header>

      <section className="ab-body">
        <div className="wrap">
          <div className="prose">
            <p>Atlas is a Los Angeles real estate practice with three sides.</p>
            <h2>Atlas Brief</h2>
            <p>
              The publication you are reading. A running log of Los Angeles multifamily deal commentary,
              construction cost reads, and owner-operator analysis. Written by David Safai, a thirty-year LA
              operator, developer, and general contractor. Not a marketing funnel. An operating journal.
            </p>
            <h2>Atlas Home Builders, Inc.</h2>
            <p>
              The legal company behind it &mdash; a licensed California Class B general contractor, founded
              in 1996. The practice operates a portfolio of approximately 126 units across multiple Los
              Angeles buildings, develops ground-up multifamily and condominium projects, and takes selective
              general contracting work for owners, developers, and family offices. Two buildings developed by
              the firm are still held by the builder: The Felix on Fairfax, a 43-unit apartment in the
              Fairfax District, and Olympic Towers, a 12-unit condominium.
            </p>
            <h2>Atlas Home Pro</h2>
            <p>
              An acquisition platform for Los Angeles home service businesses &mdash; plumbing, HVAC,
              electrical, restoration. We are a buyer. If you own a service company in Los Angeles County and
              are considering a sale, or a broker representing one, send us the details. Conversations are
              confidential.
            </p>
          </div>
        </div>
      </section>

      <section className="ab-portfolio">
        <div className="wrap">
          <div className="section-head">
            <div className="num">§ Selected work</div>
            <h2>Two buildings,<br />still held by the&nbsp;builder.</h2>
          </div>
          <div className="projects">
            <article className="project">
              <header className="p-head">
                <span className="n">P-01</span>
                <h3>The Felix on Fairfax</h3>
                <span className="cat">Multifamily · Ground-up</span>
              </header>
              <figure className="p-photo">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src="/images/projects/felix-fairfax-1200.jpg"
                  alt="The Felix on Fairfax — a five-story grey-and-white multifamily building at 731 N Fairfax Avenue, Los Angeles."
                  loading="lazy"
                  width={1200}
                  height={675}
                />
                <figcaption className="p-cap">Exterior, south elevation · 731 N Fairfax Avenue</figcaption>
              </figure>
              <dl>
                <div><dt>Units</dt><dd>43</dd></div>
                <div><dt>Stories</dt><dd>5</dd></div>
                <div><dt>Delivered</dt><dd>2023</dd></div>
                <div><dt>Held by</dt><dd>Sponsor</dd></div>
              </dl>
              <p>
                A 43-unit, five-story residential building developed, built, and held by Atlas. Designed
                around a single organizing principle: no unit plan exists that the sponsor wouldn&apos;t live
                in.
              </p>
            </article>

            <article className="project">
              <header className="p-head">
                <span className="n">P-02</span>
                <h3>Olympic Towers</h3>
                <span className="cat">Condominium · Twelve Homes</span>
              </header>
              <figure className="p-photo">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src="/images/projects/olympic-towers-1200.jpg"
                  alt="Olympic Towers — a four-story white multifamily building with orange accent bands and cantilevered balconies, Mid-City West."
                  loading="lazy"
                  width={1200}
                  height={675}
                />
                <figcaption className="p-cap">Exterior, corner elevation · Olympic Boulevard</figcaption>
              </figure>
              <dl>
                <div><dt>Units</dt><dd>12</dd></div>
                <div><dt>Type</dt><dd>Condo</dd></div>
                <div><dt>Delivered</dt><dd>2019</dd></div>
                <div><dt>Sold</dt><dd>12 of 12</dd></div>
              </dl>
              <p>
                Twelve for-sale homes in a mid-Wilshire infill. A study in how much a thoughtful building
                envelope and a real construction schedule can add to a buyer&apos;s basis without adding a
                dollar to ours.
              </p>
            </article>
          </div>
        </div>
      </section>

      <section className="ab-tail">
        <div className="wrap">
          <div className="prose">
            <hr />
            <p>
              The practice began in 1996 with a long-hold real estate thesis: buy well-located Los Angeles
              multifamily, operate it honestly, hold for decades, let debt amortize against rent growth.
              Thirty years in, the thesis has held.
            </p>
            <p>
              What changed recently is the writing. Atlas Brief exists because most of what gets published
              about Los Angeles real estate is either a brokerage pitch or a consumer service blog. Very
              little of it is written by someone who has actually operated a building, pulled a permit, or
              signed a construction draw. The Brief tries to fill that gap.
            </p>
            <p>Read it like a trade journal, not a brochure.</p>
            <p style={{ textAlign: 'right' }}><em>&mdash; David Safai</em></p>
            <p style={{ textAlign: 'right' }}>David@AtlasHomePro.com</p>
          </div>
        </div>
      </section>

      <Footer />
    </>
  )
}
