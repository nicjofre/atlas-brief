import type { Block } from 'payload'

// A single image with an optional caption. `width` lets David run it inside the
// reading column or full-bleed for impact.
export const PostImage: Block = {
  slug: 'image',
  labels: { singular: 'Image', plural: 'Images' },
  fields: [
    { name: 'image', type: 'upload', relationTo: 'media', required: true },
    { name: 'caption', type: 'text' },
    {
      name: 'width',
      type: 'select',
      defaultValue: 'normal',
      options: [
        { label: 'Normal (reading column)', value: 'normal' },
        { label: 'Full width', value: 'full' },
      ],
    },
  ],
}
