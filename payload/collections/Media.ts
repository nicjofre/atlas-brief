import type { CollectionConfig } from 'payload'

// Uploaded images (project photos, hero images, etc.). Storage is wired to the
// existing Supabase Storage bucket via a storage adapter in payload.config.ts;
// without that adapter, files fall back to the local filesystem (dev only).
export const Media: CollectionConfig = {
  slug: 'media',
  access: {
    read: () => true,
  },
  fields: [
    {
      name: 'alt',
      type: 'text',
      label: 'Alt text',
    },
  ],
  upload: true,
}
