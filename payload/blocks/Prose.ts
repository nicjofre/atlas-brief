import type { Block } from 'payload'

// A freeform rich-text section. The "variant" controls the surrounding layout:
//  - body: the standard reading column (used for the intro / three sides)
//  - tail: the closing column (adds a divider rule above, right-aligned sign-off)
// Rich text means David can add headings, paragraphs, and emphasis freely
// instead of editing a fixed set of single-purpose fields.
export const Prose: Block = {
  slug: 'prose',
  labels: { singular: 'Text section', plural: 'Text sections' },
  fields: [
    {
      name: 'variant',
      type: 'select',
      defaultValue: 'body',
      options: [
        { label: 'Standard column', value: 'body' },
        { label: 'Closing column (with divider)', value: 'tail' },
      ],
    },
    { name: 'content', type: 'richText' },
  ],
}
