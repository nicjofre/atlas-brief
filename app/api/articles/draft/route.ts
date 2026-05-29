import { NextResponse } from 'next/server'
import Anthropic from '@anthropic-ai/sdk'
import { createClient } from '@/lib/supabase/server'

export const runtime = 'nodejs'
export const maxDuration = 300

// The structural output contract sits in code (not in an editable prompt row)
// because the article editor depends on it being parseable. David edits the
// voice/policy via /admin/prompts; we control the structure via tool schemas
// (see SLICE_TOOLS below). This prompt section covers the semantic conventions
// the model must follow inside string values — class names, placeholder
// formats, em-dash prohibition, etc.
const OUTPUT_FORMAT_PROMPT = `
## [output_format]

You will be asked to call a specific tool (emit_tape_1, emit_tape_2, emit_tape_3, or emit_meta) for each slice of the article. The tool input_schema enforces structure. This section documents the semantic conventions that apply inside string values.

CRITICAL conventions:
- HTML strings should use the same class names David's prototype uses: .table-fig, .speculation, .brokers (with .broker-col, .broker-name, .broker-firm, .broker-meta), <h2 id="kebab-case"> for body sections.
- Headlines that use the *italic* convention should embed asterisks: "Address: N Doors at *$306K a Unit.*"
- Placeholders David must fill stay as literal bracketed strings: [ATLAS HEADLINE], [ATLAS READ: short hint of what goes here], [BROKER TAG NOTE], [TRADE RANGE: $X.XM-$Y.YM, $Zk-$Wk/door].
- NEVER use em-dashes (—). Use commas, periods, or parentheses.
- status_tag should reflect the deal state ("Sold, Just Closed", "For Sale · Just Listed", etc.)
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

// Tool schemas drive structured output — Claude is required to produce JSON
// matching the input_schema, which eliminates the class of bugs where HTML
// quotes inside body_html broke JSON.parse on raw text output.
//
// All 4 tools are declared on every call so the tool list (and therefore the
// prompt-cache prefix) is identical across the parallel calls; tool_choice
// picks which one the model must use for each slice.
const SLICE_TOOLS: Anthropic.Tool[] = [
  {
    name: 'emit_tape_1',
    description: 'Emit the Tape 1 slice — the 50-word one-liner per tape_1_template.',
    input_schema: {
      type: 'object',
      properties: {
        text: {
          type: 'string',
          description: 'The full Tape 1 one-liner, including the Atlas read line.',
        },
      },
      required: ['text'],
    },
  },
  {
    name: 'emit_tape_2',
    description: 'Emit the Tape 2 slice — the 250-word short per tape_2_template.',
    input_schema: {
      type: 'object',
      properties: {
        headline: {
          type: 'string',
          description: '"[ATLAS HEADLINE]" if David should fill, else actual text.',
        },
        deck: { type: 'string' },
        body_html: {
          type: 'string',
          description: '<p>...</p> markup. No headings needed at this tier.',
        },
      },
      required: ['headline', 'deck', 'body_html'],
    },
  },
  {
    name: 'emit_tape_3',
    description: 'Emit the Tape 3 slice — the 1,000-1,200 word brief per tape_3_template.',
    input_schema: {
      type: 'object',
      properties: {
        headline: { type: 'string', description: '"[ATLAS HEADLINE]" (always — David fills).' },
        deck: { type: 'string' },
        status_tag: {
          type: 'string',
          description: 'e.g. "Sold, Just Closed" or "For Sale · Just Listed".',
        },
        hero_caption: {
          type: 'string',
          description: '"FIG. 00, address ... Listing photo via ...".',
        },
        takeaways_subhead: { type: 'string' },
        takeaways: {
          type: 'array',
          items: {
            type: 'object',
            properties: {
              bold: { type: 'string' },
              text: { type: 'string' },
            },
            required: ['bold', 'text'],
          },
        },
        deal_stats_html: {
          type: 'string',
          description:
            'Inner HTML for .stats-grid — one <div class="stat"><div class="k">Label</div><div class="v">Value</div><div class="s">sub</div></div> per metric. 8-12 stats. No <table>.',
        },
        body_html: {
          type: 'string',
          description:
            'Full prose body with <h2 id="kebab-case">section</h2>, <p>, optional .table-fig and .speculation blocks. Embed [ATLAS READ: hint] placeholders at 3-4 natural points.',
        },
        byline_html: {
          type: 'string',
          description:
            'Inner HTML for the .byl div — 3-4 <div><b>Label</b>Value</div> rows (Published, Status/Read time, Dateline). Do NOT include the "David Safai · Editor · Publisher" row.',
        },
      },
      required: [
        'headline',
        'deck',
        'status_tag',
        'hero_caption',
        'takeaways_subhead',
        'takeaways',
        'deal_stats_html',
        'body_html',
        'byline_html',
      ],
    },
  },
  {
    name: 'emit_meta',
    description:
      'Emit the meta slice — gaps, tier recommendation, David-reaction angles, and broker outreach email.',
    input_schema: {
      type: 'object',
      properties: {
        gaps: { type: 'array', items: { type: 'string' } },
        tier_recommendation: {
          type: 'object',
          properties: {
            tier: { type: 'integer', enum: [1, 2, 3] },
            reason: { type: 'string' },
          },
          required: ['tier', 'reason'],
        },
        angles: {
          type: 'array',
          description: '3-5 pointed questions per the output_format spec.',
          items: { type: 'string' },
        },
        broker_outreach_email: {
          type: 'string',
          description: 'Per the broker_outreach_email prompt.',
        },
      },
      required: ['gaps', 'tier_recommendation', 'angles', 'broker_outreach_email'],
    },
  },
]

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
  // produces a smaller slice; we recombine into the AIDraft shape after they
  // all return. Wall time = max(4 calls) instead of sum(4 slices).
  //
  // tool_use forces the model to emit valid JSON matching SLICE_TOOLS'
  // input_schema, which means body_html with HTML quotes can't break parsing.
  // The full SLICE_TOOLS list goes on every call (so the cache prefix matches
  // across all 4) and tool_choice picks which one the model must use.
  // System prompt is marked for ephemeral caching so the parallel calls share
  // a cache write within the 5-minute TTL.
  async function callSlice(toolName: string, instruction: string, maxTokens: number): Promise<unknown> {
    const resp = await anthropic.messages.create({
      model: 'claude-sonnet-4-6',
      max_tokens: maxTokens,
      system: [
        { type: 'text', text: systemPrompt, cache_control: { type: 'ephemeral' } },
      ],
      tools: SLICE_TOOLS,
      tool_choice: { type: 'tool', name: toolName },
      messages: [
        { role: 'user', content: listingPreamble + instruction },
      ],
    })
    const toolUse = resp.content.find(
      (b): b is Anthropic.ToolUseBlock => b.type === 'tool_use' && b.name === toolName
    )
    if (!toolUse) {
      throw new Error(`expected tool_use(${toolName}) block, got stop_reason=${resp.stop_reason}`)
    }
    return toolUse.input
  }

  let tape1Raw: unknown, tape2Raw: unknown, tape3Raw: unknown, metaRaw: unknown
  try {
    [tape1Raw, tape2Raw, tape3Raw, metaRaw] = await Promise.all([
      callSlice(
        'emit_tape_1',
        'Call the emit_tape_1 tool with the 50-word one-liner per the tape_1_template.',
        1024
      ),
      callSlice(
        'emit_tape_2',
        'Call the emit_tape_2 tool with the 250-word short per the tape_2_template.',
        2048
      ),
      callSlice(
        'emit_tape_3',
        'Call the emit_tape_3 tool with the 1,000-1,200 word brief per the tape_3_template.',
        4096
      ),
      callSlice(
        'emit_meta',
        'Call the emit_meta tool. angles are 3-5 pointed questions per the output_format spec. Do NOT emit any tape_N content here.',
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
