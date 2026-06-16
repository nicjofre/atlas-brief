import { getPayload } from 'payload'
import config from '../payload.config.ts'
const payload = await getPayload({ config })
const res = await payload.find({ collection: 'pages', where: { slug: { equals: 'build' } }, limit: 10 })
for (const doc of res.docs) await payload.delete({ collection: 'pages', id: doc.id })
console.log(`RESULT_DELETED=${res.docs.length}`)
process.exit(0)
