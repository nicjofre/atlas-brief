import type { CollectionConfig } from 'payload'

import { Hero } from '../blocks/Hero'
import { Prose } from '../blocks/Prose'
import { Projects } from '../blocks/Projects'
import { ContactDetails } from '../blocks/ContactDetails'

// Public marketing pages (About, Contact, Build, ...). Each page is a document
// with a slug and a flexible `layout` of blocks the editor composes, reorders,
// and previews live.
//
// Preview/live-preview URLs are RELATIVE (just "/slug") so the iframe and the
// "open" link resolve against whatever origin the admin is served from —
// localhost in dev, the real domain in production, the branch URL on previews.
// No NEXT_PUBLIC_SERVER_URL needed.
export const Pages: CollectionConfig = {
  slug: 'pages',
  admin: {
    useAsTitle: 'title',
    defaultColumns: ['title', 'slug', 'updatedAt'],
    livePreview: {
      url: ({ data }) => `/${data?.slug ?? ''}`,
    },
    preview: (doc) => `/${doc?.slug ?? ''}`,
  },
  access: {
    read: () => true,
  },
  fields: [
    { name: 'title', type: 'text', required: true },
    {
      name: 'slug',
      type: 'text',
      required: true,
      unique: true,
      index: true,
      admin: { position: 'sidebar', description: 'URL path, e.g. "about".' },
    },
    {
      name: 'layout',
      type: 'blocks',
      blocks: [Hero, Prose, Projects, ContactDetails],
    },
  ],
}
