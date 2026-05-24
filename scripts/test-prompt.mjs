#!/usr/bin/env node
// Quick CLI tool to see what the current prompt set produces for a listing.
//
// Usage:
//   node scripts/test-prompt.mjs                       # uses first listing in DB
//   node scripts/test-prompt.mjs <listing-id-or-slug>  # specific listing
//   LIMIT_TAPES=1 node scripts/test-prompt.mjs         # forward env to model output
//
// Reads prompts from the DB, assembles them in sort_order, sends listing data
// as the user message, prints the assembled prompt + AI response to stdout.

import { readFileSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import path from 'node:path'
import { createClient } from '@supabase/supabase-js'
import Anthropic from '@anthropic-ai/sdk'

// Load .env.local manually (Node doesn't pick it up automatically).
const __dirname = path.dirname(fileURLToPath(import.meta.url))
const envFile = readFileSync(path.join(__dirname, '..', '.env.local'), 'utf8')
for (const line of envFile.split('\n')) {
  const m = line.match(/^([A-Z_][A-Z0-9_]*)=(.*)$/)
  if (m && !process.env[m[1]]) process.env[m[1]] = m[2].replace(/^["']|["']$/g, '')
}

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
)
const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY })

const target = process.argv[2] // listing id or slug

// 1. Pull prompts
const { data: prompts, error: pErr } = await supabase
  .from('prompts')
  .select('key, body, sort_order')
  .order('sort_order', { ascending: true })

if (pErr) {
  console.error('Could not load prompts:', pErr.message)
  process.exit(1)
}

const assembledSystem = prompts
  .map(p => `## [${p.key}]\n\n${p.body}`)
  .join('\n\n---\n\n')

// 2. Pull a listing (by slug → article → listing, or by listing id, or first available)
async function loadListing() {
  if (!target) {
    const { data } = await supabase
      .from('articles')
      .select('listing_id')
      .eq('status', 'published')
      .limit(1)
      .maybeSingle()
    return data?.listing_id
  }
  // Looks like a uuid?
  if (/^[0-9a-f-]{36}$/i.test(target)) return target
  // Treat as article slug
  const { data } = await supabase
    .from('articles')
    .select('listing_id')
    .eq('slug', target)
    .maybeSingle()
  return data?.listing_id
}

const listingId = await loadListing()
if (!listingId) {
  console.error(`No listing found for "${target ?? '(default)'}".`)
  process.exit(1)
}

const { data: listing, error: lErr } = await supabase
  .from('listings')
  .select(`
    *,
    property:properties (*),
    listing_broker:brokers!listings_listing_broker_id_fkey (*),
    buyer_broker:brokers!listings_buyer_broker_id_fkey (*)
  `)
  .eq('id', listingId)
  .maybeSingle()

if (lErr || !listing) {
  console.error('Could not load listing:', lErr?.message)
  process.exit(1)
}

const userMessage = `Here is the listing to draft. All fields come straight from the Atlas Brief database — do not invent or scrape additional data.

\`\`\`json
${JSON.stringify(listing, null, 2)}
\`\`\`

Now produce the full document (Gaps, Tier recommendation, Tape 1, Tape 2, Tape 3, Suggested broker outreach email) per the rules above.`

console.error(`> listing: ${listing.property?.street_address ?? listing.id}`)
console.error(`> prompts: ${prompts.length} sections, ${assembledSystem.length.toLocaleString()} chars`)
console.error(`> calling claude-sonnet-4-6...`)

const t0 = Date.now()
const resp = await anthropic.messages.create({
  model: 'claude-sonnet-4-6',
  max_tokens: 8192,
  system: assembledSystem,
  messages: [{ role: 'user', content: userMessage }],
})
const t1 = Date.now()

console.error(`> response: ${resp.usage.input_tokens} in / ${resp.usage.output_tokens} out tokens, ${((t1 - t0) / 1000).toFixed(1)}s`)
console.error('---')

for (const block of resp.content) {
  if (block.type === 'text') process.stdout.write(block.text)
}
process.stdout.write('\n')
