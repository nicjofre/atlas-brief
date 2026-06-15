// Seeds the Contact and Build pages into Payload with the current copy.
// Idempotent: deletes any existing contact/build pages first. Run with:
//   node --env-file=.env.local --import tsx scripts/seed-contact-build.ts

import { getPayload } from 'payload'
import config from '../payload.config.ts'

// --- Minimal Lexical helpers ---
const txt = (text: string, format = 0) => ({
  type: 'text', detail: 0, format, mode: 'normal', style: '', text, version: 1,
})
const para = (text: string, format = 0) => ({
  type: 'paragraph', children: [txt(text, format)], direction: 'ltr', format: '', indent: 0, textFormat: 0, version: 1,
})
const ITALIC = 2
const richText = (children: object[]) => ({
  root: { type: 'root', children, direction: 'ltr', format: '', indent: 0, version: 1 },
})

async function run() {
  const payload = await getPayload({ config })

  for (const slug of ['contact', 'build']) {
    const existing = await payload.find({ collection: 'pages', where: { slug: { equals: slug } }, limit: 10 })
    for (const doc of existing.docs) await payload.delete({ collection: 'pages', id: doc.id })
  }

  // ---- Contact ----
  await payload.create({
    collection: 'pages',
    data: {
      title: 'Contact',
      slug: 'contact',
      layout: [
        { blockType: 'hero', style: 'contact', eyebrow: '§ Contact', title: 'Contact.', subtitle: 'Atlas Home Builders, Inc. is based in Los Angeles.' },
        {
          blockType: 'contactDetails',
          inquiriesLabel: 'Inquiries',
          inquiries: [
            { heading: 'For editorial inquiries', body: 'If you have a listing, a comp, a trade, or a deal worth covering in The Tape: send it over. We read every submission. Interesting deals run in the next issue of the Brief. Uninteresting ones get a straight answer back the same day.' },
            { heading: 'For construction or development inquiries', body: 'If you have a project that needs a general contractor, or a site that needs a walk: describe it in a few sentences. If it is a fit, we schedule a walk within the week. If it is not, we tell you why.' },
            { heading: 'For acquisition inquiries', body: 'If you own a Los Angeles home service business and are thinking about a sale, or a broker representing one: we are a buyer. Plumbing, HVAC, electrical, restoration. Conversations are confidential. Preferred size $500K to $5M in revenue, but we will read anything that fits the thesis.' },
          ],
          sidebarLabel: 'Direct line',
          name: 'David Safai',
          role: 'Operator · Developer · GC',
          email: 'David@AtlasHomePro.com',
          phone: '(213) 275-2210',
          office: 'Los Angeles, California',
          licenseStatus: 'License [pending]',
        },
      ],
    },
  })

  // ---- Build ----
  await payload.create({
    collection: 'pages',
    data: {
      title: 'Build',
      slug: 'build',
      layout: [
        {
          blockType: 'buildHero',
          eyebrow: '§ Build · Owner-developer-GC practice',
          title: 'Build.',
          meta: [
            { label: 'Discipline', lines: 'General contracting\n& in-house trades' },
            { label: 'License', lines: 'CA Class B\nAtlas Home Builders, Inc.' },
          ],
          intro: richText([
            para('Owner-developer-GC practice. Los Angeles. Since 1996.', ITALIC),
            para('Atlas Home Builders, Inc. is a licensed California Class B general contractor. The practice has developed ground-up multifamily and condominium projects, operates its own portfolio of roughly 126 units, and takes selective general contracting work for other owners, developers, and family offices.'),
            para("We are not a service company. We are a general contracting practice run by an owner-operator who has spent thirty years on the owner's side of the table. Every job we take, we underwrite the way an owner would — because the person running the work has been the owner a hundred times over."),
          ]),
        },
        {
          blockType: 'capabilities',
          heading: 'In-house capabilities.',
          descriptor: 'The trades we run ourselves, and the ones we subcontract.',
          body: richText([
            para('General contracting, light framing, plumbing rough and trim, electrical rough and trim, HVAC, painting, restoration, gates and garage doors. We subcontract anything outside that list to people we have worked with for years and will work with for years more.'),
          ]),
        },
        {
          blockType: 'steps',
          eyebrow: '§ How we work',
          heading: 'The four-step sequence, the same every job.',
          items: [
            { label: 'Step · 01', title: 'Walk.', body: 'We walk the project with the owner, the architect, or whoever is running point. No proposal yet. We are looking at what the scope actually is, what the building actually needs, where the surprises are likely to live. If the project is not a fit, we say so on the walk.' },
            { label: 'Step · 02', title: 'Scope & Schedule.', body: 'A real scope document, a real schedule, real line items. Not marketing numbers. If the budget needs a conversation about tradeoffs, we have the conversation before the contract.' },
            { label: 'Step · 03', title: 'Build.', body: 'We open walls cleanly and close them cleaner. We run the job with the discipline of an operator who will have to live with the work for the next twenty years. We do not chase change orders.' },
            { label: 'Step · 04', title: 'Close Out.', body: 'Permits pulled, inspections signed, closeout binder delivered. The binder is built so an operator can pick it up five years from now and understand exactly what was done, by whom, and when.' },
          ],
        },
        {
          blockType: 'cta',
          label: 'Begin a project',
          heading: 'If you have a project worth running, or a property worth a walk:',
          body: 'Email David directly at David@AtlasHomePro.com. If the project is a fit, we respond within 24 hours. If it is not, we respond within 24 hours and tell you why.',
          buttonText: 'Email David →',
          buttonHref: 'mailto:David@AtlasHomePro.com',
        },
      ],
    },
  })

  console.log('Seeded Contact + Build pages.')
  process.exit(0)
}

run().catch((e) => {
  console.error(e)
  process.exit(1)
})
