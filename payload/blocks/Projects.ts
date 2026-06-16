import type { Block } from 'payload'

// The "Selected work" section: a section heading plus a repeatable list of
// projects. Each project has a photo (uploaded to Media), a variable list of
// stat rows, and a blurb. David can add, remove, and reorder projects.
export const Projects: Block = {
  slug: 'projects',
  labels: { singular: 'Projects section', plural: 'Projects sections' },
  fields: [
    { name: 'eyebrow', type: 'text', admin: { description: 'Small label, e.g. "§ Selected work".' } },
    { name: 'heading', type: 'text' },
    {
      name: 'items',
      type: 'array',
      labels: { singular: 'Project', plural: 'Projects' },
      admin: { initCollapsed: true },
      fields: [
        { name: 'code', type: 'text', admin: { description: 'e.g. P-01', width: '30%' } },
        { name: 'name', type: 'text', admin: { width: '70%' } },
        { name: 'category', type: 'text', admin: { description: 'e.g. Multifamily · Ground-up' } },
        { name: 'photo', type: 'upload', relationTo: 'media' },
        { name: 'caption', type: 'text', admin: { description: 'Caption shown under the photo.' } },
        {
          name: 'stats',
          type: 'array',
          labels: { singular: 'Stat', plural: 'Stats' },
          fields: [
            { name: 'label', type: 'text', admin: { width: '40%' } },
            { name: 'value', type: 'text', admin: { width: '60%' } },
          ],
        },
        { name: 'blurb', type: 'textarea' },
      ],
    },
  ],
}
