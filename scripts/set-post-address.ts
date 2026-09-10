/**
 * One-off backfill: set Property Address on the essays that are about a single
 * building.
 *
 * Goes through Payload's local API rather than raw SQL so the write lands in
 * the versions table too. A direct UPDATE only touches `posts`; Payload loads
 * the edit view from the latest `_posts_v` row, so the next time David opened
 * one of these and saved, the address would silently vanish.
 *
 *   npx tsx --env-file=.env.local scripts/set-post-address.ts
 *
 * Env comes from Node's --env-file (the app relies on Next to load .env.local,
 * so there's no dotenv dependency to import here).
 *
 * Idempotent: re-running sets the same values.
 */
import { getPayload } from 'payload'
import config from '../payload.config'

// Only pieces about ONE building. Deals spanning several addresses are
// deliberately left blank — pointing Google at one address of four answers the
// wrong question.
const TARGETS: { slug: string; address: string; locality: string }[] = [
  { slug: 'what-did-apple-see-in-culver-city', address: '8888 Venice Blvd', locality: 'Culver City' },
  // Set earlier by direct SQL, so re-applied here to reach the versions table.
  { slug: '62-apartments-on-catalina-almost-no-way-to-build-more', address: '321 Tremont St', locality: 'Avalon' },
]

// Vetoed after review. "The Hidden AI Boom" names exactly one address, but it
// reads as a trend piece about the AI build-out rather than a note on Anduril's
// building, so it should not compete for that address.
const CLEAR: string[] = ['The-Hidden-Ai-Boom']

async function main() {
  const payload = await getPayload({ config })

  for (const t of TARGETS) {
    const { docs } = await payload.find({
      collection: 'posts',
      where: { slug: { equals: t.slug } },
      limit: 1,
      depth: 0,
    })
    const doc = docs[0]
    if (!doc) {
      console.log(`SKIP  ${t.slug} — not found`)
      continue
    }
    const updated = await payload.update({
      collection: 'posts',
      id: doc.id,
      data: { propertyAddress: t.address, propertyLocality: t.locality },
      // Publish straight through: these are live posts and the edit is a field
      // addition, not a content revision awaiting review.
      draft: false,
      overrideAccess: true,
    })
    console.log(`OK    ${t.slug} -> ${updated.propertyAddress}, ${updated.propertyLocality}`)
  }

  for (const slug of CLEAR) {
    const { docs } = await payload.find({
      collection: 'posts',
      where: { slug: { equals: slug } },
      limit: 1,
      depth: 0,
    })
    const doc = docs[0]
    if (!doc) {
      console.log(`SKIP  ${slug} — not found`)
      continue
    }
    await payload.update({
      collection: 'posts',
      id: doc.id,
      data: { propertyAddress: null, propertyLocality: null },
      draft: false,
      overrideAccess: true,
    })
    console.log(`CLEAR ${slug}`)
  }

  process.exit(0)
}

main().catch(e => {
  console.error('FAILED', e)
  process.exit(1)
})
