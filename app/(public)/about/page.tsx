import type { Metadata } from 'next'
import Footer from '../Footer'
import { getPageContent, getPageCollection } from '@/lib/db/content'
import { createClient } from '@/lib/supabase/server'
import { resolveHeroUrl } from '@/lib/db/hero-url'
import type { Pair } from '@/lib/content-registry'
import './about.css'

export const metadata: Metadata = {
  title: 'About · Atlas Home Pro',
  description:
    'Atlas is a Los Angeles real estate practice with three sides: Atlas Brief (publication), Atlas Home Builders, Inc. (general contractor), and Atlas Home Pro (acquisitions).',
}

export default async function AboutPage() {
  const c = await getPageContent('about')
  const projects = await getPageCollection('about.projects')
  const supabase = await createClient()
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
            {projects.map((p, i) => {
              const photo = typeof p.photo === 'string' ? resolveHeroUrl(supabase, p.photo) : null
              const stats = Array.isArray(p.stats) ? (p.stats as Pair[]) : []
              return (
                <article className="project" key={(p.code as string) || i}>
                  <header className="p-head">
                    <span className="n">{p.code as string}</span>
                    <h3>{p.name as string}</h3>
                    <span className="cat">{p.category as string}</span>
                  </header>
                  {photo && (
                    <figure className="p-photo">
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img
                        src={photo}
                        alt={(p.photo_alt as string) || ''}
                        loading="lazy"
                        width={1200}
                        height={675}
                      />
                      {p.caption ? <figcaption className="p-cap">{p.caption as string}</figcaption> : null}
                    </figure>
                  )}
                  {stats.length > 0 && (
                    <dl>
                      {stats.map((s, j) => (
                        <div key={j}><dt>{s.label}</dt><dd>{s.value}</dd></div>
                      ))}
                    </dl>
                  )}
                  <p>{p.blurb as string}</p>
                </article>
              )
            })}
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
