import type { Block } from 'payload'

// The Build page header (cap-hero): eyebrow + title, a meta column of labeled
// blurbs (Discipline, License), and an intro rich-text column.
export const BuildHero: Block = {
  slug: 'buildHero',
  labels: { singular: 'Build hero', plural: 'Build heroes' },
  fields: [
    { name: 'eyebrow', type: 'text', admin: { description: 'e.g. "§ Build · Owner-developer-GC practice".' } },
    { name: 'title', type: 'text', required: true },
    {
      name: 'meta',
      type: 'array',
      labels: { singular: 'Meta item', plural: 'Meta items' },
      fields: [
        { name: 'label', type: 'text' },
        { name: 'lines', type: 'textarea', admin: { description: 'One line per row.' } },
      ],
    },
    { name: 'intro', type: 'richText' },
  ],
}
