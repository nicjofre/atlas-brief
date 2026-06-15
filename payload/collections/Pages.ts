import type { CollectionConfig } from 'payload'

import { Hero } from '../blocks/Hero'
import { Prose } from '../blocks/Prose'
import { Projects } from '../blocks/Projects'

const serverURL = process.env.NEXT_PUBLIC_SERVER_URL || 'http://localhost:3000'

// Public marketing pages (About, Contact, Build, ...). Each page is a document
// with a slug and a flexible `layout` of blocks the editor composes, reorders,
// and previews live.
export const Pages: CollectionConfig = {
  slug: 'pages',
  admin: {
    useAsTitle: 'title',
    defaultColumns: ['title', 'slug', 'updatedAt'],
    livePreview: {
      url: ({ data }) => `${serverURL}/${data?.slug ?? ''}`,
    },
    preview: (doc) => `${serverURL}/${doc?.slug ?? ''}`,
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
      blocks: [Hero, Prose, Projects],
    },
  ],
}
