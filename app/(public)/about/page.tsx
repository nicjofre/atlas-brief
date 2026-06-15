import type { Metadata } from 'next'
import Footer from '../Footer'
import { getPageContent } from '@/lib/db/content'
import './about.css'

export const metadata: Metadata = {
  title: 'About · Atlas Home Pro',
  description:
    'Atlas is a Los Angeles real estate practice with three sides: Atlas Brief (publication), Atlas Home Builders, Inc. (general contractor), and Atlas Home Pro (acquisitions).',
}

export default async function AboutPage() {
  const c = await getPageContent('about')
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
            <p>{c['about.intro']}</p>
            <h2>Atlas Brief</h2>
            <p>{c['about.brief_body']}</p>
            <h2>Atlas Home Builders, Inc.</h2>
            <p>{c['about.builders_body']}</p>
            <h2>Atlas Home Pro</h2>
            <p>{c['about.homepro_body']}</p>
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
              <p>{c['about.felix_blurb']}</p>
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
              <p>{c['about.olympic_blurb']}</p>
            </article>
          </div>
        </div>
      </section>

      <section className="ab-tail">
        <div className="wrap">
          <div className="prose">
            <hr />
            <p>{c['about.tail_p1']}</p>
            <p>{c['about.tail_p2']}</p>
            <p>{c['about.tail_p3']}</p>
            <p style={{ textAlign: 'right' }}><em>&mdash; David Safai</em></p>
            <p style={{ textAlign: 'right' }}>David@AtlasHomePro.com</p>
          </div>
        </div>
      </section>

      <Footer />
    </>
  )
}
