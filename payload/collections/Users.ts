import type { CollectionConfig } from 'payload'

// Admin users for the Payload CMS panel (e.g. David). This is Payload's own
// auth, separate from the Supabase auth used by the rest of the app.
export const Users: CollectionConfig = {
  slug: 'users',
  auth: true,
  admin: {
    useAsTitle: 'email',
  },
  fields: [
    {
      name: 'name',
      type: 'text',
    },
  ],
}
