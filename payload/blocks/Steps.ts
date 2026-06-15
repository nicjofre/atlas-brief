import type { Block } from 'payload'

// Build page "how we work" section: a heading and an ordered list of steps.
export const Steps: Block = {
  slug: 'steps',
  labels: { singular: 'Steps section', plural: 'Steps sections' },
  fields: [
    { name: 'eyebrow', type: 'text', admin: { description: 'e.g. "§ How we work".' } },
    { name: 'heading', type: 'text' },
    {
      name: 'items',
      type: 'array',
      labels: { singular: 'Step', plural: 'Steps' },
      fields: [
        { name: 'label', type: 'text', admin: { description: 'e.g. "Step · 01".', width: '40%' } },
        { name: 'title', type: 'text', admin: { width: '60%' } },
        { name: 'body', type: 'textarea' },
      ],
    },
  ],
}
