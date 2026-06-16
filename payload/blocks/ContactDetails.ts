import type { Block } from 'payload'

// The Contact page "c-main" section: a two-column layout with an inquiries
// column (repeatable heading + body) and a sidebar with direct contact info.
export const ContactDetails: Block = {
  slug: 'contactDetails',
  labels: { singular: 'Contact details', plural: 'Contact details' },
  fields: [
    { name: 'inquiriesLabel', type: 'text', defaultValue: 'Inquiries' },
    {
      name: 'inquiries',
      type: 'array',
      labels: { singular: 'Inquiry', plural: 'Inquiries' },
      fields: [
        { name: 'heading', type: 'text' },
        { name: 'body', type: 'textarea' },
      ],
    },
    { name: 'sidebarLabel', type: 'text', defaultValue: 'Direct line' },
    { name: 'name', type: 'text' },
    { name: 'role', type: 'text', admin: { description: 'e.g. Operator · Developer · GC' } },
    { name: 'email', type: 'text' },
    { name: 'phone', type: 'text' },
    { name: 'office', type: 'text' },
    { name: 'licenseStatus', type: 'text', admin: { description: 'Small line under the license.' } },
  ],
}
