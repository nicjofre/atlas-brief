import { getPayload } from 'payload'
import config from '@payload-config'
import type { Post } from '@/payload-types'

// Fetch a published freeform Post by slug via the Payload local API. depth:2 so
// upload relationships (hero image, block images) come back as populated Media
// objects. Only published docs are returned — drafts stay in the CMS.
export async function getPostBySlug(slug: string): Promise<Post | null> {
  const payload = await getPayload({ config })
  const { docs } = await payload.find({
    collection: 'posts',
    where: { slug: { equals: slug }, _status: { equals: 'published' } },
    depth: 2,
    limit: 1,
  })
  return docs[0] ?? null
}

// All published posts as lightweight cards for the feed bridge (Phase 2).
export async function getPublishedPosts(): Promise<Post[]> {
  const payload = await getPayload({ config })
  const { docs } = await payload.find({
    collection: 'posts',
    where: { _status: { equals: 'published' } },
    depth: 1,
    limit: 200,
    sort: '-publishedAt',
  })
  return docs
}
