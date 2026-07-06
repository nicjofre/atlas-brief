import React from 'react'
import { RichText } from '@payloadcms/richtext-lexical/react'
import type { Post, Media } from '@/payload-types'

type Blocks = NonNullable<Post['layout']>
type Block = Blocks[number]

function asMedia(v: unknown): Media | null {
  return v && typeof v === 'object' ? (v as Media) : null
}

// Turn a YouTube URL into an embeddable id. Everything else falls back to a link.
function youTubeId(url: string): string | null {
  const m = url.match(/(?:youtube\.com\/(?:watch\?v=|embed\/)|youtu\.be\/)([\w-]{11})/)
  return m ? m[1] : null
}

// Renders a freeform post's block layout into the article body. Text flows in
// the reading column (.prose); images can go full-bleed; quotes/galleries/embeds
// are their own styled blocks. Shares post.css with briefs.
export default function PostBlocks({ blocks }: { blocks: Post['layout'] }) {
  if (!blocks?.length) return null
  return <>{blocks.map((block, i) => <BlockItem key={block.id || i} block={block} />)}</>
}

function BlockItem({ block }: { block: Block }) {
  switch (block.blockType) {
    case 'richText':
      return block.content ? (
        <div className="post-prose prose">
          <RichText data={block.content} />
        </div>
      ) : null

    case 'image': {
      const img = asMedia(block.image)
      if (!img?.url) return null
      return (
        <figure className={block.width === 'full' ? 'post-figure post-figure-full' : 'post-figure'}>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={img.url} alt={img.alt || block.caption || ''} loading="lazy" />
          {block.caption && <figcaption>{block.caption}</figcaption>}
        </figure>
      )
    }

    case 'gallery': {
      const items = (block.items || []).map(it => asMedia(it.image)).filter((m): m is Media => !!m?.url)
      if (!items.length) return null
      return (
        <figure className="post-gallery">
          <div className="post-gallery-grid" style={{ gridTemplateColumns: `repeat(${Math.min(items.length, 3)}, 1fr)` }}>
            {items.map((m, i) => (
              // eslint-disable-next-line @next/next/no-img-element
              <img key={i} src={m.url!} alt={m.alt || ''} loading="lazy" />
            ))}
          </div>
          {block.caption && <figcaption>{block.caption}</figcaption>}
        </figure>
      )
    }

    case 'quote':
      return (
        <blockquote className="post-pullquote">
          <p>{block.quote}</p>
          {block.attribution && <cite>{block.attribution}</cite>}
        </blockquote>
      )

    case 'embed': {
      const yt = youTubeId(block.url)
      return (
        <figure className="post-embed">
          {yt ? (
            <div className="post-embed-frame">
              <iframe
                src={`https://www.youtube.com/embed/${yt}`}
                title={block.caption || 'Embedded video'}
                allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                allowFullScreen
              />
            </div>
          ) : (
            <a href={block.url} target="_blank" rel="noopener noreferrer" className="post-embed-link">
              {block.url}
            </a>
          )}
          {block.caption && <figcaption>{block.caption}</figcaption>}
        </figure>
      )
    }

    default:
      return null
  }
}
