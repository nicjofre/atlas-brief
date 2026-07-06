import type { CollectionConfig } from 'payload'

import { PostRichText } from '../blocks/post/RichText'
import { PostImage } from '../blocks/post/Image'
import { PostGallery } from '../blocks/post/Gallery'
import { PostQuote } from '../blocks/post/Quote'
import { PostEmbed } from '../blocks/post/Embed'

// Freeform articles ("Posts") — essays, special reports, and anything that
// doesn't fit the fixed brief (Tape 3) structure. Authored here in the block
// editor with images, then bridged into the public site so they live in The
// Tape feed and share the /atlas-brief/[slug] URL namespace with briefs.
//
// Field choices map onto what the feed, dispatch email, and article page need:
// title -> headline, deck -> teaser, heroImage -> hero/share image, kicker ->
// category label, publishedAt -> feed ordering. Drafts are on, so only
// published posts surface publicly.
export const Posts: CollectionConfig = {
  slug: 'posts',
  admin: {
    useAsTitle: 'title',
    defaultColumns: ['title', 'slug', 'publishedAt', '_status', 'updatedAt'],
    livePreview: { url: ({ data }) => `/atlas-brief/${data?.slug ?? ''}` },
    preview: (doc) => `/atlas-brief/${doc?.slug ?? ''}`,
  },
  versions: { drafts: true },
  access: {
    // Public can read published docs; drafts stay private to the admin.
    read: ({ req }) => {
      if (req.user) return true
      return { _status: { equals: 'published' } }
    },
  },
  fields: [
    { name: 'title', type: 'text', required: true },
    {
      name: 'slug',
      type: 'text',
      required: true,
      unique: true,
      index: true,
      admin: { position: 'sidebar', description: 'URL path under /atlas-brief/. Must be unique (and not clash with a brief).' },
    },
    {
      name: 'kicker',
      type: 'text',
      admin: { position: 'sidebar', description: 'Category label, e.g. "Essay" or "Special Report".' },
    },
    {
      name: 'publishedAt',
      type: 'date',
      defaultValue: () => new Date().toISOString(),
      admin: { position: 'sidebar', description: 'Controls ordering in The Tape feed.' },
    },
    {
      name: 'author',
      type: 'text',
      defaultValue: 'David Safai',
      admin: { position: 'sidebar' },
    },
    {
      name: 'deck',
      type: 'textarea',
      admin: { description: 'One-sentence standfirst under the headline. Also the share/dispatch teaser.' },
    },
    { name: 'heroImage', type: 'upload', relationTo: 'media' },
    { name: 'heroCaption', type: 'text' },
    {
      name: 'layout',
      type: 'blocks',
      labels: { singular: 'Section', plural: 'Sections' },
      blocks: [PostRichText, PostImage, PostGallery, PostQuote, PostEmbed],
    },
  ],
}
