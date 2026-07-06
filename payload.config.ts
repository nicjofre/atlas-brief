import path from 'path'
import { fileURLToPath } from 'url'

import { buildConfig } from 'payload'
import { postgresAdapter } from '@payloadcms/db-postgres'
import { lexicalEditor } from '@payloadcms/richtext-lexical'
import { s3Storage } from '@payloadcms/storage-s3'

import { Users } from './payload/collections/Users'
import { Media } from './payload/collections/Media'
import { Pages } from './payload/collections/Pages'
import { Posts } from './payload/collections/Posts'

const filename = fileURLToPath(import.meta.url)
const dirname = path.dirname(filename)

// Store Media in Supabase Storage (S3-compatible) when configured; otherwise
// fall back to local disk (dev). This keeps uploads persistent on Vercel.
const plugins =
  process.env.S3_BUCKET && process.env.S3_ACCESS_KEY_ID
    ? [
        s3Storage({
          collections: { media: true },
          bucket: process.env.S3_BUCKET,
          config: {
            endpoint: process.env.S3_ENDPOINT,
            region: process.env.S3_REGION || 'us-east-2',
            forcePathStyle: true,
            credentials: {
              accessKeyId: process.env.S3_ACCESS_KEY_ID,
              secretAccessKey: process.env.S3_SECRET_ACCESS_KEY || '',
            },
          },
        }),
      ]
    : []

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
  collections: [Users, Media, Pages, Posts],
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
  plugins,
})
