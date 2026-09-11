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
        return (
          <header className="c-hero">
            <div className="wrap">
              {/* Same opening row as the About header: label left, standfirst
                  pushed right, title centred beneath them. */}
              {(block.eyebrow || block.subtitle) && (
                <div className="c-kicker">
                  {block.eyebrow && <div className="k">{block.eyebrow}</div>}
                  {block.subtitle && <p className="c-standfirst">{block.subtitle}</p>}
                </div>
              )}
              <h1>{withBriefMark(block.title)}</h1>
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
                      {item.code && <span className="n">{item.code}</span>}
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
      return (
        <section className="c-main">
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
          </div>
          <aside className="c-side">
            {block.sidebarLabel && <div className="k">{block.sidebarLabel}</div>}
            {block.name && <h3>{block.name}</h3>}
            {block.role && (
              <p style={{ fontStyle: 'italic', fontSize: 13, color: 'var(--muted)', marginTop: -8, marginBottom: 18 }}>
                {block.role}
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
        </section>
      )
    }

    default:
      return null
  }
}
