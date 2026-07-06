import type { Block } from 'payload'

// Two or more images shown side by side. Good for before/after, a set of comps,
// or a small photo essay within a post.
export const PostGallery: Block = {
  slug: 'gallery',
  labels: { singular: 'Gallery', plural: 'Galleries' },
  fields: [
    { name: 'caption', type: 'text', admin: { description: 'Optional caption under the whole row.' } },
    {
      name: 'items',
      type: 'array',
      minRows: 2,
      labels: { singular: 'Image', plural: 'Images' },
      fields: [{ name: 'image', type: 'upload', relationTo: 'media', required: true }],
    },
  ],
}
