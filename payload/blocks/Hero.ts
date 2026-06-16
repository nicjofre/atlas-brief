import type { Block } from 'payload'

// Top-of-page header. `style` switches the page-specific wrapper/markup:
//  - about:   header.ab-top (eyebrow + title)
//  - contact: header.c-hero (eyebrow + title + subtitle)
export const Hero: Block = {
  slug: 'hero',
  labels: { singular: 'Hero', plural: 'Heroes' },
  fields: [
    {
      name: 'style',
      type: 'select',
      defaultValue: 'about',
      options: [
        { label: 'About', value: 'about' },
        { label: 'Contact', value: 'contact' },
      ],
    },
    { name: 'eyebrow', type: 'text', admin: { description: 'Small label above the title, e.g. "§ About".' } },
    { name: 'title', type: 'text', required: true },
    { name: 'subtitle', type: 'text', admin: { description: 'Optional line under the title (Contact style).' } },
  ],
}
