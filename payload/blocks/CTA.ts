import type { Block } from 'payload'

// A closing call-to-action band (used on Build): label, heading, body, and a
// single button with its own link.
export const CTA: Block = {
  slug: 'cta',
  labels: { singular: 'Call to action', plural: 'Calls to action' },
  fields: [
    { name: 'label', type: 'text' },
    { name: 'heading', type: 'text' },
    { name: 'body', type: 'textarea' },
    { name: 'buttonText', type: 'text' },
    { name: 'buttonHref', type: 'text', admin: { description: 'e.g. mailto:David@AtlasHomePro.com' } },
  ],
}
