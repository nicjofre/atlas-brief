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
    // Route through /next/preview so draft mode is enabled — the live preview
    // then renders the in-progress (unpublished) draft, not the published one.
    livePreview: {
      url: ({ data }) => `/next/preview?path=${encodeURIComponent(`/atlas-brief/${data?.slug ?? ''}`)}`,
    },
    preview: (doc) => `/next/preview?path=${encodeURIComponent(`/atlas-brief/${doc?.slug ?? ''}`)}`,
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
      // Guard against colliding with a brief's slug — briefs win at the URL
      // resolver, so a clash would silently shadow the post. Checked on save;
      // never blocks on a DB hiccup.
      validate: async (value: string | null | undefined) => {
        if (!value) return 'Slug is required.'
        try {
          const { Client } = await import('pg')
          const c = new Client({ connectionString: process.env.DATABASE_URI })
          await c.connect()
          const r = await c.query('select 1 from public.articles where slug = $1 and deleted_at is null limit 1', [value])
          await c.end()
          if (r.rowCount) return `A brief already uses "${value}". Choose a different slug.`
        } catch {
          // Don't block saving if the check can't run.
        }
        return true
      },
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
    // Owners and brokers search by street address and nothing else. Tape briefs
    // get theirs from a linked property record; a post has none, so when the
    // piece is about a specific building the address has to be typed here.
    // Filling it in puts the address at the front of the search title, into the
    // byline, and into the structured data crawlers read — the same treatment a
    // brief gets. Left blank (a market essay), the post is unchanged.
    {
      name: 'propertyAddress',
      type: 'text',
      admin: {
        description:
          'Optional. Street address, if this piece is about a specific building — e.g. "321 Tremont St". Leads the Google result title and appears in the byline. Leave blank for general essays.',
      },
    },
    {
      name: 'propertyLocality',
      type: 'text',
      admin: {
        description:
          'Optional. City or neighbourhood for the address above — e.g. "Avalon". Only used when Property Address is set.',
        condition: (data) => !!data?.propertyAddress,
      },
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
