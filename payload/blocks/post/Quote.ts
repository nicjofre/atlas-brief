import type { Block } from 'payload'

// A large pull quote, visually distinct from an inline blockquote in the text.
export const PostQuote: Block = {
  slug: 'quote',
  labels: { singular: 'Pull quote', plural: 'Pull quotes' },
  fields: [
    { name: 'quote', type: 'textarea', required: true },
    { name: 'attribution', type: 'text', admin: { description: 'Optional — who said it.' } },
  ],
}
