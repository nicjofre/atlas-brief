import type { Block } from 'payload'

// The workhorse writing block for a freeform post. Lexical rich text covers
// headings, paragraphs, bold/italic, links, and lists — so most of an article
// is just one or more of these. Images, galleries, quotes, and embeds are
// separate blocks placed between the text.
export const PostRichText: Block = {
  slug: 'richText',
  labels: { singular: 'Text', plural: 'Text' },
  fields: [{ name: 'content', type: 'richText' }],
}
