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

// The Contact page (Lucas, 2026-11-23; approved as is): three inquiries side
// by side under a section rule, David in a newspaper staff box along the
// bottom. Styles .cy-*. Take 1 (inquiries as a news column, David in a
// right column, .cx-*) was removed once Lucas chose; it's in commit c4b76e8.

function BlockItem({ block }: { block: Block }) {
  switch (block.blockType) {
    case 'hero':
      if (block.style === 'contact') {
        // The Tape's header AS IT IS NOW (checked on the live page,
        // 2026-11-23): title, then a one-line description beside it, no
        // dateline. (A dateline was copied from stale Tape CSS first; the
        // Tape dropped it.) The description is NEW COPY; David should see it.
        // Styles: contact.css .cy-head.
        return (
          <header className="cy-head">
            <h1>Contact us</h1>
            {/* Lucas's wording (2026-11-23), spelling tidied. Was: "Deals for
                The Tape, projects to build, businesses for sale. Every message
                goes to David." */}
            <p className="cy-about">
              To highlight any interesting trades in the market, your projects, and/or any acquisitions. We’ll do our best to follow through as quickly as possible.
            </p>
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
      // The link under each inquiry, its own line (Lucas, 2026-11-23; was
      // "Email David" on all three). Matched on the heading's wording.
      const linkFor = (h?: string | null) => {
        const s = (h || '').toLowerCase()
        if (s.includes('editorial')) return 'Pitch us a deal'
        if (s.includes('construction') || s.includes('development')) return 'Tell us about the project'
        if (s.includes('acquisition')) return 'Tell us about the business'
        return 'Email David'
      }
      // Inquiry text rewritten in code (Lucas, 2026-11-25), matched on the
      // heading like linkFor; the CMS keeps David's text until he approves.
      // null = use the CMS body; an array = one paragraph each.
      const bodyFor = (h?: string | null): React.ReactNode | React.ReactNode[] | null => {
        const s = (h || '').toLowerCase()
        // Editorial. CMS text was: "If you have a listing, a comp, a trade,
        // or a deal worth covering in The Tape: send it over. We read every
        // submission. Interesting deals run in the next issue of the Brief.
        // Uninteresting ones get a straight answer back the same day."
        if (s.includes('editorial')) return (
          <>
            Have a trade, listing or comp you think belongs in{' '}
            <span className="cy-red">The Tape</span>? Send us the address and
            what you know about the deal. We read every submission, and the
            ones we pick will have their own articles in{' '}
            <span className="cy-red">The Tape</span>.
          </>
        )
        // Construction or development. CMS text was: "If you have a project
        // that needs a general contractor, reviewing the numbers or a site
        // that needs a walk: describe it in a few sentences. If it is a fit,
        // we schedule a walk within the week. If it is not, we tell you why."
        if (s.includes('construction') || s.includes('development')) return (
          <>
            We take on select construction and development work in Los
            Angeles, from building a project to reviewing its numbers. Tell us
            what you&rsquo;re working on in a few sentences and we&rsquo;ll let
            you know if we can help.
          </>
        )
        // Acquisition. CMS text was: "If you own a Los Angeles home service
        // business and are thinking about a sale, or a broker representing
        // one: we are a buyer. Plumbing, HVAC, electrical, restoration.
        // Conversations are confidential. Preferred size $500K to $5M in
        // revenue, but we will read anything that fits the thesis."
        // The confidentiality line on its own, between asterisks, as on About.
        if (s.includes('acquisition')) return [
          <>
            We buy home service businesses in Los Angeles, such as plumbing,
            HVAC, electrical and restoration companies, usually with $500K to
            $5M in revenue. If you own one and are thinking about selling, or
            you&rsquo;re a broker representing one, tell us a little about it.
          </>,
          '*All conversations are kept confidential.*',
        ]
        return null
      }
      // The three inquiries side by side under the home page's 2px section
      // rule, hairlines between them (the Tape row / .ft-quad), each with a
      // link that opens a message with the subject filled in; then David in
      // a staff box along the bottom: photo, name in the Owner's Notes
      // Times, and his details side by side. Was main's c-main / c-form /
      // c-side markup (on main and backup/contact-about-2026-11-23).
      return (
        <section className="cy-main">
          <div className="cy-desks">
            {(block.inquiries || []).map((inq, i) => {
              const topic = topicOf(inq.heading)
              return (
                <article key={inq.id || i} className="cy-desk">
                  <h2>{inq.heading}</h2>
                  {(() => {
                    const b = bodyFor(inq.heading)
                    if (Array.isArray(b)) return b.map((p, j) => <p key={j}>{p}</p>)
                    return <p>{b ?? inq.body}</p>
                  })()}
                  {block.email && (
                    <a className="cy-read" href={`mailto:${block.email}?subject=${encodeURIComponent(`${topic} inquiry`)}`}>
                      {linkFor(inq.heading)}
                    </a>
                  )}
                </article>
              )
            })}
          </div>
          <aside className="cy-staff" aria-label="Contact David directly">
            <div className="cy-who">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src="/images/david-safai.jpg" alt="" width={637} height={720} loading="lazy" />
              <div>
                <h2>{block.name || 'David Safai'}</h2>
                {/* Lucas's line (2026-11-23), not CMS. Was the CMS role,
                    "Operator, Developer, GC", which is still there. */}
                <p>Head of Atlas</p>
              </div>
            </div>
            <dl className="cy-rows">
              {block.email && (<div><dt>Email</dt><dd><a href={`mailto:${block.email}`}>{block.email}</a></dd></div>)}
              {block.phone && (<div><dt>Phone</dt><dd><a href={telHref}>{block.phone}</a></dd></div>)}
              {block.office && (<div><dt>Office</dt><dd>{block.office}</dd></div>)}
              {/* "CSLB #" as the label, just the number under it (Lucas,
                  2026-11-23). Was: License / CA Class B General Contractor,
                  CSLB # 1160484. The CMS field reads "CSLB # 1160484". */}
              {block.licenseStatus && (<div><dt>CSLB #</dt><dd>{block.licenseStatus.replace(/^\s*CSLB\s*#\s*/i, '')}</dd></div>)}
            </dl>
          </aside>
        </section>
      )
    }

    default:
      return null
  }
}
