import React from 'react'
import { RichText } from '@payloadcms/richtext-lexical/react'
import type { Page, Media } from '@/payload-types'
import AtlasMark from '../AtlasMark'
import { hand } from '../hand-font'
import ContactForm from '../contact/ContactForm'
import InquiryCards from '../contact/InquiryCards'
import DavidPopup from '../contact/DavidPopup'
import ContactDesk from '../contact/ContactDesk'
import ContactSentence from '../contact/ContactSentence'
import ContactDirectory from '../contact/ContactDirectory'
import { CONTACT_VARIANT } from '../contact/variant'

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
        return (
          <header className="c-hero">
            <div className="wrap">
              {/* Same opening row as the About header: label left, standfirst
                  pushed right, title centred beneath them. */}
              {(block.eyebrow || block.subtitle) && (
                <div className="c-kicker">
                  {block.eyebrow && <div className="k">{block.eyebrow}</div>}
                  {/* Dots swapped for punctuation on display (2026-11-06), as on
                      About's cards; the CMS text is untouched. Was {block.subtitle}. */}
                  {block.subtitle && (
                    <p className="c-standfirst">
                      {block.subtitle.replace(' · ', '. ').replace(/ · /g, ', ')}
                    </p>
                  )}
                </div>
              )}
              <h1>{withBriefMark(block.title)}</h1>
              <p className="hero-arms">Real Estate · Construction · Acquisitions</p>
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
            {/* The front page's Owner's Notes head (2026-11-04, Lucas): a navy
                ribbon folding behind the panel, then the CMS heading as a
                handwritten note with a red underline. Was:
                  <div className="section-head">
                    {block.eyebrow && <div className="num">{block.eyebrow}</div>}
                    {block.heading && <h2>{block.heading}</h2>}
                  </div>
                (the eyebrow was cleared in the CMS on 2026-09-11). */}
            <header className="ab-bldg-head">
              <h2 className="ab-band"><span>Our buildings</span></h2>
              {block.heading && (
                <p className={`ab-bldg-note ${hand.className}`}>
                  {block.heading}
                  <svg className="ab-scribble" viewBox="0 0 220 12" preserveAspectRatio="none" aria-hidden="true">
                    <path d="M3 8 C 40 3, 80 11, 120 6 S 190 3, 217 7" />
                  </svg>
                </p>
              )}
            </header>
            <div className="projects">
              {(block.items || []).map((item, idx) => {
                const photo = item.photo && typeof item.photo === 'object' ? (item.photo as Media) : null
                return (
                  <article className="project" key={item.id || idx}>
                    <header className="p-head">
                      {/* item.code ("P-01") is no longer shown (2026-10-07): it read
                          as a template's numbering. The CMS field stays. */}
                      <h3>{item.name}</h3>
                      {/* " · " shown as ", " (2026-11-04): middle-dot strings
                          read as template chrome. The CMS text is unchanged. */}
                      {item.category && <span className="cat">{item.category.replace(/ · /g, ', ')}</span>}
                    </header>
                    {photo?.url && (
                      <figure className="p-photo">
                        {/* eslint-disable-next-line @next/next/no-img-element */}
                        <img src={photo.url} alt={photo.alt || ''} loading="lazy" width={1200} height={675} />
                        {item.caption && <figcaption className="p-cap">{item.caption.replace(/ · /g, ', ')}</figcaption>}
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
      // The navy band with David's details, parked 2026-11-23 for the pop-up.
      const showBand = false as boolean
      return (
        <>
        <section className={`c-main c-v${CONTACT_VARIANT}`}>
          {/* Layouts being compared (Lucas, 2026-11-23); see contact/variant.ts. */}
          {CONTACT_VARIANT === 1 ? (
            <ContactDesk inquiries={block.inquiries || []} />
          ) : CONTACT_VARIANT === 2 ? (
            <ContactSentence inquiries={block.inquiries || []} />
          ) : CONTACT_VARIANT === 3 ? (
            <ContactDirectory inquiries={block.inquiries || []} />
          ) : (
          <>
          {/* Just the inquiry titles, each in a beige card with navy writing,
              stacked (Lucas, 2026-11-22). The paragraphs are left out; the
              text is still in the CMS. Tried before this and dropped: the
              same cards on a wheel with arrows. Was, to put back (contact.css
              still styles it):
                <div className="c-form">
                  {block.inquiriesLabel && <div className="k">{block.inquiriesLabel}</div>}
                  {(block.inquiries || []).map((inq, i) => (
                    <React.Fragment key={inq.id || i}>
                      <h2 style={i > 0 ? { marginTop: 36 } : undefined}>
                        <strong>{inq.heading}</strong>
                      </h2>
                      <p>{inq.body}</p>
                    </React.Fragment>
                  ))}
                </div> */}
          {/* Each title opens to show its paragraph (Lucas, 2026-11-22), now
              with a slide-and-fade (2026-11-23). Was native <details> per
              card, which snapped open; see contact/InquiryCards.tsx. */}
          <InquiryCards inquiries={block.inquiries || []} />
          {/* "Drop us a line" form beside the inquiry cards: cards left, form
              right (Lucas, 2026-11-22). Not connected yet; see ContactForm.tsx. */}
          <ContactForm />
          </>
          )}
        </section>
        {/* "Rather message us?" as a button that opens David's details in a
            pop-up (Lucas, 2026-11-23); see contact/DavidPopup.tsx. */}
        <DavidPopup
          david={{
            name: block.name,
            role: block.role,
            email: block.email,
            phone: block.phone,
            office: block.office,
            licenseStatus: block.licenseStatus,
          }}
        />
        {/* PARKED 2026-11-23 (was live at 36fddd8): David's details on a navy
            band that scrolled up over the titles and form, with
            contact/ContactReveal.tsx. To restore: delete <DavidPopup> above,
            set showBand to true (or drop the wrapper), and put <ContactReveal />
            back in contact/page.tsx and the .c-main sticky rule in contact.css. */}
        {showBand && (
        <section className="c-band">
          <svg className="c-band-arrow" viewBox="0 0 24 14" aria-hidden="true">
            <path d="M3 11.5 12 3l9 8.5" />
          </svg>
          {/* A question at the top of the band, to call the reader to slide it
              up (Lucas, 2026-11-22). Not CMS text; David should see it before
              it ships. */}
          <h2 className="c-band-q">Rather message us?</h2>
          {/* David's photo beside his card (Lucas, 2026-11-19). The file is
              public/images/david-safai.jpg; not a CMS field yet. contact.css
              lays the photo and the card out side by side (.c-card-row). */}
          <div className="c-card-row">
          <figure className="c-photo">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src="/images/david-safai.jpg" alt={block.name || 'David Safai'} width={637} height={720} loading="lazy" />
          </figure>
          <aside className="c-side">
            {block.sidebarLabel && <div className="k">{block.sidebarLabel}</div>}
            {block.name && <h3>{block.name}</h3>}
            {block.role && (
              <p style={{ fontStyle: 'italic', fontSize: 13, color: 'var(--muted)', marginTop: -8, marginBottom: 18 }}>
                {block.role.replace(/ · /g, ', ')}
              </p>
            )}
            <dl>
              {block.email && (
                <div>
                  <dt>Email</dt>
                  <dd><a href={`mailto:${block.email}`}>{block.email}</a></dd>
                </div>
              )}
              {block.phone && (
                <div>
                  <dt>Phone</dt>
                  <dd><a href={telHref}>{block.phone}</a></dd>
                </div>
              )}
              {block.office && (
                <div>
                  <dt>Office</dt>
                  <dd>{block.office}</dd>
                </div>
              )}
              {block.licenseStatus && (
                <div>
                  <dt>License</dt>
                  <dd>
                    CA Class B General Contractor<br />
                    <span style={{ fontFamily: 'var(--mono)', fontSize: 11, color: 'var(--muted)', letterSpacing: '.1em', textTransform: 'uppercase' }}>
                      {block.licenseStatus}
                    </span>
                  </dd>
                </div>
              )}
            </dl>
          </aside>
          </div>
        </section>
        )}
        </>
      )
    }

    default:
      return null
  }
}
