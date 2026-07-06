import type { Block } from 'payload'

// An embedded YouTube video or X (Twitter) post. David pastes the URL; the
// renderer turns known providers into an iframe, and falls back to a link.
export const PostEmbed: Block = {
  slug: 'embed',
  labels: { singular: 'Embed', plural: 'Embeds' },
  fields: [
    { name: 'url', type: 'text', required: true, admin: { description: 'YouTube or X (Twitter) URL.' } },
    { name: 'caption', type: 'text' },
  ],
}
