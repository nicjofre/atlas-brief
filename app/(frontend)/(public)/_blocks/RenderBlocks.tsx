import React from 'react'
import { RichText } from '@payloadcms/richtext-lexical/react'
import type { Page, Media } from '@/payload-types'

type Block = NonNullable<Page['layout']>[number]

// Renders newline-separated text with <br/> between lines.
function MultiLine({ text }: { text?: string | null }) {
  if (!text) return null
  const lines = text.split('\n')
  return (
    <>
      {lines.map((line, i) => (
        <React.Fragment key={i}>
          {line}
          {i < lines.length - 1 && <br />}
        </React.Fragment>
      ))}
    </>
  )
}

// Renders a page's block layout into the bespoke marketing markup/classes
// (about.css / contact.css / build.css). Each block type maps to one section.
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

function BlockItem({ block }: { block: Block }) {
  switch (block.blockType) {
    case 'hero':
      if (block.style === 'contact') {
        return (
          <header className="c-hero">
            <div className="wrap">
              {block.eyebrow && <div className="k">{block.eyebrow}</div>}
              <h1>{block.title}</h1>
              {block.subtitle && <p>{block.subtitle}</p>}
            </div>
          </header>
        )
      }
      return (
        <header className="ab-top">
          <div className="wrap">
            {block.eyebrow && <div className="eyebrow">{block.eyebrow}</div>}
            <h1>{block.title}</h1>
          </div>
        </header>
      )

    case 'prose': {
      const isTail = block.variant === 'tail'
      return (
        <section className={isTail ? 'ab-tail' : 'ab-body'}>
          <div className="wrap">
            <div className="prose">
              {isTail && <hr />}
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

    case 'buildHero':
      return (
        <header className="cap-hero">
          <div className="wrap">
            {block.eyebrow && <div className="k">{block.eyebrow}</div>}
            <h1>{block.title}</h1>
            <div className="grid">
              <div className="meta">
                {(block.meta || []).map((m, i) => (
                  <React.Fragment key={m.id || i}>
                    <b>{m.label}</b>
                    <MultiLine text={m.lines} />
                    {i < (block.meta || []).length - 1 && <><br /><br /></>}
                  </React.Fragment>
                ))}
              </div>
              <div>{block.intro && <RichText data={block.intro} />}</div>
            </div>
          </div>
        </header>
      )

    case 'capabilities':
      return (
        <section className="trade">
          <div className="wrap">
            <div className="trade-row">
              <span className="n">§</span>
              <div>
                {block.heading && <h2>{block.heading}</h2>}
                {block.descriptor && <div className="disc">{block.descriptor}</div>}
              </div>
              <div className="body">{block.body && <RichText data={block.body} />}</div>
            </div>
          </div>
        </section>
      )

    case 'steps':
      return (
        <section className="how">
          <div className="wrap">
            <div className="how-head">
              {block.eyebrow && <div className="num">{block.eyebrow}</div>}
              {block.heading && <h2>{block.heading}</h2>}
            </div>
            <div className="how-grid">
              {(block.items || []).map((step, i) => (
                <div className="how-step" key={step.id || i}>
                  {step.label && <div className="n">{step.label}</div>}
                  {step.title && <h4>{step.title}</h4>}
                  {step.body && <p>{step.body}</p>}
                </div>
              ))}
            </div>
          </div>
        </section>
      )

    case 'cta':
      return (
        <section className="cta">
          <div className="wrap">
            <div className="cta-inner">
              <div>
                {block.label && <div className="k">{block.label}</div>}
                {block.heading && <h2>{block.heading}</h2>}
                {block.body && <p style={{ marginTop: 14 }}>{block.body}</p>}
              </div>
              {block.buttonText && (
                <a href={block.buttonHref || '#'} className="btn-w">{block.buttonText}</a>
              )}
            </div>
          </div>
        </section>
      )

    default:
      return null
  }
}
