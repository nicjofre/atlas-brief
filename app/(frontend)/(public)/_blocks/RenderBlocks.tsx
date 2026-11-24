import React from 'react'
import { RichText } from '@payloadcms/richtext-lexical/react'
import type { Page, Media } from '@/payload-types'
import AtlasMark from '../AtlasMark'

type Block = NonNullable<Page['layout']>[number]

// Renders a page's block layout into the bespoke marketing markup/classes
// (about.css / contact.css). Each block type maps to one section.
export default function RenderBlocks({ blocks }: { blocks: Page['layout'] }) {
  if (!blocks?.length) return null
  return (
    <>
      {blocks.map((block, i) => (
        <BlockItem key={block.id || i} block={block} />
      ))}
    </>
  )
}

// The house lockup sets "Atlas" in navy and what follows it in red — the nav,
// the footer, the masthead and the Tape flag all render "Atlas Brief" that way.
// CMS titles are plain text, so the mark gets applied here rather than asking an
// editor to type HTML. Any "Atlas <something>" title gets the same treatment.
function withBriefMark(title?: string | null) {
  if (!title) return null
  if (title.startsWith('Atlas ')) {
    return (
      <>
        {'Atlas '}
        <em>{title.slice('Atlas '.length)}</em>
      </>
    )
  }
  return title
}

function BlockItem({ block }: { block: Block }) {
  switch (block.blockType) {
    case 'hero':
      if (block.style === 'contact') {
        // Contact, fresh start (Lucas, 2026-11-23): set like the Tape's and
        // Owner's Notes' headers so the page reads as part of the paper.
        // Title left in bold Times navy, a one-line description in the right
        // column. The description is NEW COPY (not CMS); David should see it.
        // Was main's c-hero header (on main and backup/contact-about-2026-11-23).
        // Styles: contact.css .cx-head.
        return (
          <header className="cx-head">
            <div className="cx-head-in">
              <h1>Contact us</h1>
              <p className="cx-about">
                Deals for The Tape, projects to build, businesses for sale. Every message goes to David.
              </p>
            </div>
          </header>
        )
      }
      return (
        <header className="ab-top">
          <div className="wrap">
            {/* Label left, standfirst pushed to the right edge — the same row
                shape as an article's kicker (badge left, date right). */}
            {(block.eyebrow || block.subtitle) && (
              <div className="ab-kicker">
                {block.eyebrow && <div className="eyebrow">{block.eyebrow}</div>}
                {block.subtitle && <p className="ab-standfirst">{block.subtitle}</p>}
              </div>
            )}
            <h1>{withBriefMark(block.title)}</h1>
            {/* The practice's three sides, per the identity sheet's About comp.
                Hardcoded rather than a CMS field: adding one to the hero block
                means a schema change, and this is brand copy, not page copy. */}
            {block.style === 'about' && (
              <p className="hero-arms">Real Estate · Construction · Acquisitions</p>
            )}
          </div>
        </header>
      )

    case 'prose': {
      const isTail = block.variant === 'tail'
      // The tail is the sign-off: the roundel stands to the left of the copy in
      // place of the rule that used to sit above it.
      if (isTail) {
        return (
          <section className="ab-tail">
            <div className="wrap">
              <div className="ab-tail-in">
                <div className="prose">
                  {block.content && <RichText data={block.content} />}
                </div>
                <AtlasMark size={96} />
              </div>
            </div>
          </section>
        )
      }
      return (
        <section className="ab-body">
          <div className="wrap">
            <div className="prose">
              {block.content && <RichText data={block.content} />}
            </div>
          </div>
        </section>
      )
    }

    case 'projects':
      return (
        <section className="ab-portfolio">
          <div className="wrap">
            <div className="section-head">
              {block.eyebrow && <div className="num">{block.eyebrow}</div>}
              {block.heading && <h2>{block.heading}</h2>}
            </div>
            <div className="projects">
              {(block.items || []).map((item, idx) => {
                const photo = item.photo && typeof item.photo === 'object' ? (item.photo as Media) : null
                return (
                  <article className="project" key={item.id || idx}>
                    <header className="p-head">
                      {/* item.code ("P-01") is no longer shown (2026-10-07): it read
                          as a template's numbering. The CMS field stays. */}
                      <h3>{item.name}</h3>
                      {item.category && <span className="cat">{item.category}</span>}
                    </header>
                    {photo?.url && (
                      <figure className="p-photo">
                        {/* eslint-disable-next-line @next/next/no-img-element */}
                        <img src={photo.url} alt={photo.alt || ''} loading="lazy" width={1200} height={675} />
                        {item.caption && <figcaption className="p-cap">{item.caption}</figcaption>}
                      </figure>
                    )}
                    {item.stats && item.stats.length > 0 && (
                      <dl>
                        {item.stats.map((s, j) => (
                          <div key={s.id || j}>
                            <dt>{s.label}</dt>
                            <dd>{s.value}</dd>
                          </div>
                        ))}
                      </dl>
                    )}
                    {item.blurb && <p>{item.blurb}</p>}
                  </article>
                )
              })}
            </div>
          </div>
        </section>
      )

    case 'contactDetails': {
      const telHref = `tel:${(block.phone || '').replace(/[^\d+]/g, '')}`
      // "For construction or development inquiries" -> "Construction or development"
      const topicOf = (h?: string | null) => {
        const t = (h || '').replace(/^for\s+/i, '').replace(/\s+inquir(y|ies)\s*$/i, '').trim()
        return t.charAt(0).toUpperCase() + t.slice(1)
      }
      // Contact, fresh start (Lucas, 2026-11-23): laid out like the Tape's
      // package grid (7fr | 4fr) with the home page's story type. Left: the
      // three inquiries as a news column (red kicker, bold headline, dek,
      // hairline between), each with an "Email David" link that opens a
      // message with the subject filled in. Right, past a hairline: David as
      // a section head (Times, like "Most read deals"), his photo, then his
      // details as ruled rows. Every size and colour is an existing site
      // rule; see contact.css .cx-*. Was main's c-main / c-form / c-side
      // markup (on main and backup/contact-about-2026-11-23).
      return (
        <section className="cx-main">
          <div className="cx-desks">
            {(block.inquiries || []).map((inq, i) => {
              const topic = topicOf(inq.heading)
              return (
                <article key={inq.id || i} className="cx-desk">
                  {/* Red kicker removed (Lucas, 2026-11-23: redundant with the
                      headline). Was: <p className="cx-kicker">{topic}</p> */}
                  <h2>{inq.heading}</h2>
                  <p className="cx-dek">{inq.body}</p>
                  {block.email && (
                    <a className="cx-read" href={`mailto:${block.email}?subject=${encodeURIComponent(`${topic} inquiry`)}`}>
                      Email David
                    </a>
                  )}
                </article>
              )
            })}
          </div>
          <aside className="cx-side" aria-label="Contact David directly">
            <h2 className="cx-side-hed">{block.name || 'David Safai'}</h2>
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img className="cx-photo" src="/images/david-safai.jpg" alt="" width={637} height={720} loading="lazy" />
            {block.role && <p className="cx-role">{block.role.replace(/ · /g, ', ')}</p>}
            <dl className="cx-rows">
              {block.email && (<div><dt>Email</dt><dd><a href={`mailto:${block.email}`}>{block.email}</a></dd></div>)}
              {block.phone && (<div><dt>Phone</dt><dd><a href={telHref}>{block.phone}</a></dd></div>)}
              {block.office && (<div><dt>Office</dt><dd>{block.office}</dd></div>)}
              {block.licenseStatus && (<div><dt>License</dt><dd>CA Class B General Contractor, {block.licenseStatus}</dd></div>)}
            </dl>
          </aside>
        </section>
      )
    }

    default:
      return null
  }
}
