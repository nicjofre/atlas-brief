import { RichText } from '@payloadcms/richtext-lexical/react'
import type { Page, Media } from '@/payload-types'

type Block = NonNullable<Page['layout']>[number]

// Renders a page's block layout into the bespoke marketing markup/classes
// (about.css etc.). Each block type maps to one section of the page.
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

    default:
      return null
  }
}
