import path from 'path'
import { fileURLToPath } from 'url'

import { buildConfig } from 'payload'
import { postgresAdapter } from '@payloadcms/db-postgres'
import { lexicalEditor } from '@payloadcms/richtext-lexical'
import sharp from 'sharp'

import { Users } from './payload/collections/Users'
import { Media } from './payload/collections/Media'
import { Pages } from './payload/collections/Pages'

const filename = fileURLToPath(import.meta.url)
const dirname = path.dirname(filename)

export default buildConfig({
  // Mount the admin panel and REST/GraphQL API off non-default paths so they
  // don't collide with the app's existing /admin and /api routes.
  routes: {
    admin: '/cms',
    api: '/cms-api',
  },
  admin: {
    user: Users.slug,
  },
  collections: [Users, Media, Pages],
  editor: lexicalEditor(),
  secret: process.env.PAYLOAD_SECRET || '',
  typescript: {
    outputFile: path.resolve(dirname, 'payload-types.ts'),
  },
  db: postgresAdapter({
    pool: {
      connectionString: process.env.DATABASE_URI || '',
    },
    // Keep all Payload tables in their own schema, isolated from the app's
    // existing public-schema tables (listings, articles, etc.).
    schemaName: 'payload',
  }),
  sharp,
})
