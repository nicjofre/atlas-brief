// Seeds the About page into Payload with the current copy, so switching the
// public page over to Payload changes nothing visually day one.
//
// Idempotent: deletes any existing About page + the two seeded project images
// before recreating them. Run with:
//   node --env-file=.env.local --import tsx scripts/seed-about.ts

import path from 'path'
import { fileURLToPath } from 'url'
import { getPayload } from 'payload'
import config from '../payload.config.ts'

const dirname = path.dirname(fileURLToPath(import.meta.url))
const projectRoot = path.resolve(dirname, '..')

// --- Minimal Lexical helpers (build editor state JSON by hand) ---
const txt = (text: string) => ({
  type: 'text', detail: 0, format: 0, mode: 'normal', style: '', text, version: 1,
})
const para = (text: string) => ({
  type: 'paragraph', children: [txt(text)], direction: 'ltr', format: '', indent: 0, textFormat: 0, version: 1,
})
const h2 = (text: string) => ({
  type: 'heading', tag: 'h2', children: [txt(text)], direction: 'ltr', format: '', indent: 0, version: 1,
})
const richText = (children: object[]) => ({
  root: { type: 'root', children, direction: 'ltr', format: '', indent: 0, version: 1 },
})

async function run() {
  const payload = await getPayload({ config })

  // 1. Clean up prior seed (idempotent re-runs)
  const existing = await payload.find({ collection: 'pages', where: { slug: { equals: 'about' } }, limit: 10 })
  for (const doc of existing.docs) {
    await payload.delete({ collection: 'pages', id: doc.id })
  }
  for (const filename of ['felix-fairfax-1200.jpg', 'olympic-towers-1200.jpg']) {
    const m = await payload.find({ collection: 'media', where: { filename: { equals: filename } }, limit: 10 })
    for (const doc of m.docs) await payload.delete({ collection: 'media', id: doc.id })
  }

  // 2. Upload the two project photos to Media
  const felix = await payload.create({
    collection: 'media',
    filePath: path.join(projectRoot, 'public/images/projects/felix-fairfax-1200.jpg'),
    data: {
      alt: 'The Felix on Fairfax — a five-story grey-and-white multifamily building at 731 N Fairfax Avenue, Los Angeles.',
    },
  })
  const olympic = await payload.create({
    collection: 'media',
    filePath: path.join(projectRoot, 'public/images/projects/olympic-towers-1200.jpg'),
    data: {
      alt: 'Olympic Towers — a four-story white multifamily building with orange accent bands and cantilevered balconies, Mid-City West.',
    },
  })

  // 3. Create the About page
  await payload.create({
    collection: 'pages',
    data: {
      title: 'About',
      slug: 'about',
      layout: [
        { blockType: 'hero', eyebrow: '§ About', title: 'About.' },
        {
          blockType: 'prose',
          variant: 'body',
          content: richText([
            para('Atlas is a Los Angeles real estate practice with three sides.'),
            h2('Atlas Brief'),
            para('The publication you are reading. A running log of Los Angeles multifamily deal commentary, construction cost reads, and owner-operator analysis. Written by David Safai, a thirty-year LA operator, developer, and general contractor. Not a marketing funnel. An operating journal.'),
            h2('Atlas Home Builders, Inc.'),
            para('The legal company behind it — a licensed California Class B general contractor, founded in 1996. The practice operates a portfolio of approximately 126 units across multiple Los Angeles buildings, develops ground-up multifamily and condominium projects, and takes selective general contracting work for owners, developers, and family offices. Two buildings developed by the firm are still held by the builder: The Felix on Fairfax, a 43-unit apartment in the Fairfax District, and Olympic Towers, a 12-unit condominium.'),
            h2('Atlas Home Pro'),
            para('An acquisition platform for Los Angeles home service businesses — plumbing, HVAC, electrical, restoration. We are a buyer. If you own a service company in Los Angeles County and are considering a sale, or a broker representing one, send us the details. Conversations are confidential.'),
          ]),
        },
        {
          blockType: 'projects',
          eyebrow: '§ Selected work',
          heading: 'Two buildings, still held by the builder.',
          items: [
            {
              code: 'P-01',
              name: 'The Felix on Fairfax',
              category: 'Multifamily · Ground-up',
              photo: felix.id,
              caption: 'Exterior, south elevation · 731 N Fairfax Avenue',
              stats: [
                { label: 'Units', value: '43' },
                { label: 'Stories', value: '5' },
                { label: 'Delivered', value: '2023' },
                { label: 'Held by', value: 'Sponsor' },
              ],
              blurb: "A 43-unit, five-story residential building developed, built, and held by Atlas. Designed around a single organizing principle: no unit plan exists that the sponsor wouldn't live in.",
            },
            {
              code: 'P-02',
              name: 'Olympic Towers',
              category: 'Condominium · Twelve Homes',
              photo: olympic.id,
              caption: 'Exterior, corner elevation · Olympic Boulevard',
              stats: [
                { label: 'Units', value: '12' },
                { label: 'Type', value: 'Condo' },
                { label: 'Delivered', value: '2019' },
                { label: 'Sold', value: '12 of 12' },
              ],
              blurb: "Twelve for-sale homes in a mid-Wilshire infill. A study in how much a thoughtful building envelope and a real construction schedule can add to a buyer's basis without adding a dollar to ours.",
            },
          ],
        },
        {
          blockType: 'prose',
          variant: 'tail',
          content: richText([
            para('The practice began in 1996 with a long-hold real estate thesis: buy well-located Los Angeles multifamily, operate it honestly, hold for decades, let debt amortize against rent growth. Thirty years in, the thesis has held.'),
            para('What changed recently is the writing. Atlas Brief exists because most of what gets published about Los Angeles real estate is either a brokerage pitch or a consumer service blog. Very little of it is written by someone who has actually operated a building, pulled a permit, or signed a construction draw. The Brief tries to fill that gap.'),
            para('Read it like a trade journal, not a brochure.'),
            para('— David Safai'),
            para('David@AtlasHomePro.com'),
          ]),
        },
      ],
    },
  })

  console.log('Seeded About page + 2 project images.')
  process.exit(0)
}

run().catch((e) => {
  console.error(e)
  process.exit(1)
})
