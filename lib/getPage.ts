import { getPayload } from 'payload'
import config from '@payload-config'
import type { Page } from '@/payload-types'

// Fetch a public page document by slug via the Payload local API. depth:2 so
// upload relationships (project photos) are populated into Media objects.
export async function getPageBySlug(slug: string): Promise<Page | null> {
  const payload = await getPayload({ config })
  const { docs } = await payload.find({
    collection: 'pages',
    where: { slug: { equals: slug } },
    depth: 2,
    limit: 1,
  })
  return docs[0] ?? null
}
