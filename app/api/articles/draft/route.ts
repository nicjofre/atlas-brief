import { NextResponse } from 'next/server'
import Anthropic from '@anthropic-ai/sdk'
import { createClient } from '@/lib/supabase/server'

export const runtime = 'nodejs'
export const maxDuration = 300

// The structural output contract sits in code (not in an editable prompt row)
// because the article editor depends on it being parseable. David edits the
// voice/policy via /admin/prompts; we control the JSON shape.
const OUTPUT_FORMAT_PROMPT = `
## [output_format]

You MUST return a single JSON object matching this exact shape. Return ONLY the JSON, no surrounding prose or markdown fences.

\`\`\`
{
  "gaps": [string, ...],
  "tier_recommendation": { "tier": 1|2|3, "reason": string },
  "angles": [string, ...],   // 3-5 deal-specific questions for David to react to
  "tape_1": {
    "text": string  // the full Tape 1 one-liner, including the Atlas read line
  },
  "tape_2": {
    "headline": string,        // "[ATLAS HEADLINE]" if it should be David-filled, else actual text
    "deck": string,
    "body_html": string        // <p>...</p>, no headings needed at this tier
  },
  "tape_3": {
    "headline": string,         // "[ATLAS HEADLINE]" (always — David fills)
    "deck": string,
    "status_tag": string,       // e.g. "Sold, Just Closed" or "For Sale · Just Listed"
    "hero_caption": string,     // "FIG. 00, address ... Listing photo via ..."
    "takeaways_subhead": string,
    "takeaways": [{ "bold": string, "text": string }, ...],
    "deal_stats_html": string,  // inner HTML for the .stats-grid div (one .stat per metric)
    "body_html": string,        // full prose body with <h2 id="...">section</h2>, <p>, optional .table-fig and .speculation blocks. Embed [ATLAS READ: hint] placeholders at 3-4 natural points.
    "byline_html": string       // inner HTML for the .byl div, e.g. 4 <div><b>Label</b>Value</div> items
  },
  "broker_outreach_email": string
}
\`\`\`

CRITICAL conventions inside the JSON:
- HTML strings should use the same class names David's prototype uses: .table-fig, .speculation, .brokers (with .broker-col, .broker-name, .broker-firm, .broker-meta), <h2 id="kebab-case"> for body sections.
- Headlines that use the *italic* convention should embed asterisks: "Address: N Doors at *$306K a Unit.*"
- Placeholders David must fill stay as literal bracketed strings: [ATLAS HEADLINE], [ATLAS READ: short hint of what goes here], [BROKER TAG NOTE], [TRADE RANGE: $X.XM-$Y.YM, $Zk-$Wk/door].
- NEVER use em-dashes (—). Use commas, periods, or parentheses.
- Status tag should reflect the deal state ("Sold, Just Closed", "For Sale · Just Listed", etc.)
- deal_stats_html MUST use the 3-div structure shown below. Do NOT use <b>label</b>value. Do NOT use a <table>. Keep it to 8-12 stats. Each stat needs k (label), v (the big value), and s (a small sub-label clarifying the figure).

  EXAMPLE deal_stats_html (literally — copy this structure):
  <div class="stat"><div class="k">List Price</div><div class="v">$4,295,000</div><div class="s">asking</div></div><div class="stat"><div class="k">Units</div><div class="v">14</div><div class="s">4 × 1+1 · 10 × 2+2</div></div><div class="stat"><div class="k">Price / Unit</div><div class="v">$306,786</div><div class="s">per door</div></div><div class="stat"><div class="k">CAP (Current)</div><div class="v">4.86%</div><div class="s">broker stated</div></div>

- byline_html MUST be 3-4 <div><b>Label</b>Value</div> rows. Standard labels: Published, Status (or Read time), Dateline. The "David Safai · Editor · Publisher" row is added in code; do NOT include it.
- angles is a list of 3-5 pointed questions, each tied to what makes THIS deal interesting or controversial. They prompt David's operator take. Examples (do not copy verbatim — generate based on the listing):
    * "What's your honest trade range? Broker's at $X.XM."
    * "Soft-story status isn't on the flyer. Day-one ask?"
    * "Broker's pitching a Y% market CAP. Buy it?"
    * "What's the headline you'd write?"
    * "Anything to call out about the broker themselves?"
  Pick angles that map to the placeholders ([TRADE RANGE], [ATLAS HEADLINE], [ATLAS READ:], [BROKER TAG NOTE]) and to the controversy moves you applied in Tape 3.
`.trim()

type AIDraft = {
  gaps: string[]
  tier_recommendation: { tier: 1 | 2 | 3; reason: string }
  angles: string[]
  tape_1: { text: string }
  tape_2: { headline: string; deck: string; body_html: string }
  tape_3: {
    headline: string
    deck: string
    status_tag: string
    hero_caption: string
    takeaways_subhead: string
    takeaways: Array<{ bold: string; text: string }>
    deal_stats_html: string
    body_html: string
    byline_html: string
  }
  broker_outreach_email: string
}

// Relocate misplaced structured blocks out of body_html. The AI often dumps
// .stats-grid, .key-takeaways .kt-card, .byl, and .brokers blocks into the
// prose body even when output_format tells it not to. We pull them out and
// put them in the right field if that field is empty.
//
// We do raw-regex extraction rather than parse-with-DOMParser because this
// runs in Node (no DOM) and the AI's HTML is consistent enough for regex.
function relocateStructuredBlocks(t: AIDraft['tape_3']): AIDraft['tape_3'] {
  if (!t || !t.body_html) return t
  let body = t.body_html

  // 1. Stats grid — strip a full <section class="deal-stats">...</section>
  //    or a bare <div class="stats-grid">...</div>.
  if (!t.deal_stats_html || t.deal_stats_html.trim() === '') {
    const sectionMatch = body.match(/<section\s+class="deal-stats"[^>]*>([\s\S]*?)<\/section>/i)
    if (sectionMatch) {
      const inner = sectionMatch[1]
      const gridMatch = inner.match(/<div\s+class="stats-grid"[^>]*>([\s\S]*?)<\/div>\s*$/i)
        ?? inner.match(/<div\s+class="stats-grid"[^>]*>([\s\S]*?)<\/div>/i)
      if (gridMatch) {
        t = { ...t, deal_stats_html: gridMatch[1].trim() }
        body = body.replace(sectionMatch[0], '')
      }
    } else {
      const gridMatch = body.match(/<div\s+class="stats-grid"[^>]*>([\s\S]*?)<\/div>(?=\s*<(?:h2|section|div|p|$))/i)
        ?? body.match(/<div\s+class="stats-grid"[^>]*>([\s\S]*?)<\/div>/i)
      if (gridMatch) {
        t = { ...t, deal_stats_html: gridMatch[1].trim() }
        body = body.replace(gridMatch[0], '')
      }
    }
  }

  // 2. Takeaways block — pull from <section class="key-takeaways">…<div class="kt-card">
  //    or a bare <div class="kt-card">. Populate takeaways_subhead + takeaways[]
  //    if they're empty.
  if (!t.takeaways || t.takeaways.length === 0) {
    const ktMatch =
      body.match(/<section\s+class="key-takeaways"[^>]*>([\s\S]*?)<\/section>/i)
      ?? body.match(/<div\s+class="kt-card"[^>]*>([\s\S]*?)<\/div>\s*<\/div>?/i)
    if (ktMatch) {
      const inner = ktMatch[1]
      const subheadMatch = inner.match(/<b[^>]*>([\s\S]*?)<\/b>/i)
      const subhead = subheadMatch ? stripTags(subheadMatch[1]).trim() : t.takeaways_subhead
      const items: Array<{ bold: string; text: string }> = []
      const liRe = /<li[^>]*>([\s\S]*?)<\/li>/gi
      let m: RegExpExecArray | null
      while ((m = liRe.exec(inner)) !== null) {
        const liInner = m[1]
        const bMatch = liInner.match(/<b[^>]*>([\s\S]*?)<\/b>/i)
        const bold = bMatch ? stripTags(bMatch[1]).trim() : ''
        const text = stripTags(liInner.replace(bMatch?.[0] ?? '', '')).trim()
        items.push({ bold, text })
      }
      if (items.length > 0) {
        t = {
          ...t,
          takeaways: items,
          takeaways_subhead: t.takeaways_subhead || subhead,
        }
        body = body.replace(ktMatch[0], '')
      }
    }
  }

  // 2b. Split inline numbered runs. AI often emits "<p>1. First 2. Second 3. Third</p>"
  //     instead of one <p> per numbered point. Detect and split.
  body = splitInlineNumberedParagraphs(body)

  // 3. Byline — pull from <div class="byl">…</div>.
  if (!t.byline_html || t.byline_html.trim() === '') {
    const bylMatch = body.match(/<div\s+class="byl"[^>]*>([\s\S]*?)<\/div>\s*(?=<(?:h2|section|hr|div|p))/i)
      ?? body.match(/<div\s+class="byl"[^>]*>([\s\S]*?)<\/div>/i)
    if (bylMatch) {
      t = { ...t, byline_html: bylMatch[1].trim() }
      body = body.replace(bylMatch[0], '')
    }
  }

  return { ...t, body_html: body.trim() }
}

function stripTags(s: string): string {
  return s.replace(/<[^>]+>/g, '')
}

// Detect paragraphs that contain multiple inline numbered items
// (e.g. "<p>1. First 2. Second 3. Third</p>") and split each into its own
// <p>, replacing the bare "N." with a bolded ordinal like "One.".
function splitInlineNumberedParagraphs(html: string): string {
  return html.replace(/<p[^>]*>([\s\S]*?)<\/p>/gi, (match, inner) => {
    // Match patterns like " 1. " followed by content, where there are 2+ such markers.
    const markerCount = (inner.match(/(?:^|\s)\d+\.\s/g) ?? []).length
    if (markerCount < 2) return match
    // Split on the marker boundaries.
    const parts = inner.split(/(?:^|\s)(\d+)\.\s+/)
    // split yields: [pre, num, body, num, body, ...]
    const out: string[] = []
    if (parts[0]?.trim()) out.push(`<p>${parts[0].trim()}</p>`)
    for (let i = 1; i + 1 < parts.length; i += 2) {
      const ordinal = ordinalWord(Number(parts[i]))
      const txt = parts[i + 1].trim()
      out.push(`<p><strong>${ordinal}.</strong> ${txt}</p>`)
    }
    return out.join('\n')
  })
}

function ordinalWord(n: number): string {
  const words = ['Zero', 'One', 'Two', 'Three', 'Four', 'Five', 'Six', 'Seven', 'Eight', 'Nine', 'Ten']
  return words[n] ?? String(n)
}

function slugify(s: string): string {
  return s
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/(^-|-$)/g, '')
    .slice(0, 80)
}

export async function POST(req: Request) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) {
    return NextResponse.json({ error: 'unauthorized' }, { status: 401 })
  }

  const body = await req.json().catch(() => ({})) as { listingId?: string }
  if (!body.listingId) {
    return NextResponse.json({ error: 'listingId required' }, { status: 400 })
  }

  // Refuse if a non-trashed article already exists (1:1 with listings while
  // both are alive — trashed rows are ignored thanks to the partial unique
  // index on listing_id).
  const { data: existing } = await supabase
    .from('articles')
    .select('id, status')
    .eq('listing_id', body.listingId)
    .is('deleted_at', null)
    .maybeSingle()
  if (existing) {
    return NextResponse.json(
      { error: `An article already exists for this listing (${existing.status}).`, articleId: existing.id },
      { status: 409 }
    )
  }

  // Pull every prompt section ordered as they'll be assembled, plus listing data.
  const [{ data: prompts, error: pErr }, { data: listing, error: lErr }] = await Promise.all([
    supabase.from('prompts').select('key, body, sort_order').order('sort_order', { ascending: true }),
    supabase
      .from('listings')
      .select(`
        *,
        property:properties (*),
        listing_broker:brokers!listings_listing_broker_id_fkey (*),
        buyer_broker:brokers!listings_buyer_broker_id_fkey (*)
      `)
      .eq('id', body.listingId)
      .maybeSingle(),
  ])
  if (pErr) return NextResponse.json({ error: `prompts load: ${pErr.message}` }, { status: 500 })
  if (lErr) return NextResponse.json({ error: `listing load: ${lErr.message}` }, { status: 500 })
  if (!listing) return NextResponse.json({ error: 'listing not found' }, { status: 404 })
  if (!prompts || prompts.length === 0) return NextResponse.json({ error: 'no prompts configured' }, { status: 500 })

  const editorialPrompt = prompts.map(p => `## [${p.key}]\n\n${p.body}`).join('\n\n---\n\n')
  const systemPrompt = `${editorialPrompt}\n\n---\n\n${OUTPUT_FORMAT_PROMPT}`

  const listingJson = JSON.stringify(listing, null, 2)
  const listingPreamble = `Listing data (all fields from the Atlas Brief database — do not invent or scrape additional data):

\`\`\`json
${listingJson}
\`\`\`

`

  const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY! })

  // Fire 4 parallel calls instead of one giant sequential call. Each call
  // produces a smaller JSON slice; we recombine into the AIDraft shape after
  // they all return. Wall time = max(4 calls) instead of sum(4 slices).
  // System prompt is marked for ephemeral caching so the parallel calls share
  // a cache write within the 5-minute TTL — repeat drafts within a session
  // benefit too.
  async function callSlice(instruction: string, maxTokens: number): Promise<unknown> {
    const resp = await anthropic.messages.create({
      model: 'claude-sonnet-4-6',
      max_tokens: maxTokens,
      system: [
        { type: 'text', text: systemPrompt, cache_control: { type: 'ephemeral' } },
      ],
      messages: [
        { role: 'user', content: listingPreamble + instruction },
      ],
    })
    const text = resp.content
      .filter((b): b is Anthropic.TextBlock => b.type === 'text')
      .map(b => b.text)
      .join('')
    const cleaned = text.replace(/^```(?:json)?\s*/i, '').replace(/\s*```\s*$/i, '').trim()
    return JSON.parse(cleaned)
  }

  let tape1Raw: unknown, tape2Raw: unknown, tape3Raw: unknown, metaRaw: unknown
  try {
    [tape1Raw, tape2Raw, tape3Raw, metaRaw] = await Promise.all([
      callSlice(
        'Return ONLY the tape_1 slice from output_format as a JSON object: `{ "text": string }`. The 50-word one-liner per the tape_1_template.',
        1024
      ),
      callSlice(
        'Return ONLY the tape_2 slice from output_format as a JSON object: `{ "headline": string, "deck": string, "body_html": string }`. The 250-word short per the tape_2_template.',
        2048
      ),
      callSlice(
        'Return ONLY the tape_3 slice from output_format as a JSON object with these exact keys: headline, deck, status_tag, hero_caption, takeaways_subhead, takeaways (array of {bold,text}), deal_stats_html, body_html, byline_html. The 1,000-1,200 word brief per the tape_3_template.',
        4096
      ),
      callSlice(
        'Return ONLY a JSON object with these exact keys: gaps (string array), tier_recommendation ({ tier: 1|2|3, reason: string }), angles (3-5 pointed questions per the output_format spec), broker_outreach_email (string per the broker_outreach_email prompt). Do NOT include any tape_N fields.',
        2048
      ),
    ])
  } catch (e) {
    return NextResponse.json(
      { error: `anthropic error: ${e instanceof Error ? e.message : String(e)}` },
      { status: 502 }
    )
  }

  const tape1 = tape1Raw as AIDraft['tape_1']
  const tape2 = tape2Raw as AIDraft['tape_2']
  const tape3 = tape3Raw as AIDraft['tape_3']
  const meta = metaRaw as {
    gaps: string[]
    tier_recommendation: AIDraft['tier_recommendation']
    angles: string[]
    broker_outreach_email: string
  }

  const parsed: AIDraft = {
    gaps: Array.isArray(meta.gaps) ? meta.gaps : [],
    tier_recommendation: meta.tier_recommendation,
    angles: Array.isArray(meta.angles) ? meta.angles : [],
    tape_1: tape1,
    tape_2: tape2,
    tape_3: tape3,
    broker_outreach_email: meta.broker_outreach_email ?? '',
  }

  // Defensive post-processing: even with the output_format spec, Claude often
  // collapses structured blocks (deal stats, takeaways, byline, brokers) into
  // body_html. Move them back to their proper fields so the editor's typed
  // panels stay populated.
  if (parsed.tape_3) {
    parsed.tape_3 = relocateStructuredBlocks(parsed.tape_3)
  }

  // Auto-derive slug + entry_num so the row satisfies NOT NULL constraints.
  const addr = listing.property?.street_address ?? listing.id
  const baseSlug = slugify(addr) || `listing-${listing.id.slice(0, 8)}`
  const sectionSlug = 'broker-activity'

  // Slug must be unique. If a draft for this slug already exists (e.g. user
  // re-tried), append a short suffix.
  let slug = baseSlug
  const { data: slugCheck } = await supabase.from('articles').select('id').eq('slug', slug).maybeSingle()
  if (slugCheck) {
    slug = `${baseSlug}-${listing.id.slice(0, 6)}`
  }

  // entry_num: next available per (section_slug).
  const { data: maxRow } = await supabase
    .from('articles')
    .select('entry_num')
    .eq('section_slug', sectionSlug)
    .order('entry_num', { ascending: false })
    .limit(1)
    .maybeSingle()
  const entry_num = (maxRow?.entry_num ?? 0) + 1

  const recTier = parsed.tier_recommendation?.tier ?? 3

  const { data: inserted, error: iErr } = await supabase
    .from('articles')
    .insert({
      listing_id: body.listingId,
      slug,
      section_slug: sectionSlug,
      entry_num,
      tape_tier: recTier,
      status: 'draft',
      headline: parsed.tape_3?.headline ?? '[ATLAS HEADLINE]',
      deck: parsed.tape_3?.deck ?? null,
      ai_draft: parsed as unknown as never,
      david_reactions: {
        angles: Array.isArray(parsed.angles) ? parsed.angles : [],
        response: '',
        recorded_at: null,
      } as unknown as never,
      created_by: user.id,
    })
    .select('id, slug')
    .single()
  if (iErr) {
    return NextResponse.json({ error: `insert error: ${iErr.message}` }, { status: 500 })
  }

  return NextResponse.json({
    ok: true,
    articleId: inserted.id,
    slug: inserted.slug,
  })
}
