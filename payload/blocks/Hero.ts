import type { Block } from 'payload'

// Top-of-page header: a small eyebrow label (e.g. "§ About") and the big title.
export const Hero: Block = {
  slug: 'hero',
  labels: { singular: 'Hero', plural: 'Heroes' },
  fields: [
    { name: 'eyebrow', type: 'text', admin: { description: 'Small label above the title, e.g. "§ About".' } },
    { name: 'title', type: 'text', required: true },
  ],
}
