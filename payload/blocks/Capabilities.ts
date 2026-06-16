import type { Block } from 'payload'

// Build page "trade" section: a heading, a short descriptor, and a body.
export const Capabilities: Block = {
  slug: 'capabilities',
  labels: { singular: 'Capabilities', plural: 'Capabilities' },
  fields: [
    { name: 'heading', type: 'text' },
    { name: 'descriptor', type: 'text', admin: { description: 'Small line under the heading.' } },
    { name: 'body', type: 'richText' },
  ],
}
