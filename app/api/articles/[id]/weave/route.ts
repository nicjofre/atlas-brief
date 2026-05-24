import { NextResponse } from 'next/server'
import Anthropic from '@anthropic-ai/sdk'
import { createClient } from '@/lib/supabase/server'

export const runtime = 'nodejs'
export const maxDuration = 300

// Weave call only updates Tape 3 (where David's voice matters most). This
// keeps the output tokens small (~3K instead of 8K for a full re-roll) and
// makes the latency tolerable.
const WEAVE_INSTRUCTIONS = `
You are revising an Atlas Brief Tape 3 article to incorporate David Safai's operator voice.

You will be given:
  - The current Tape 3 draft (headline, deck, status_tag, hero_caption, takeaways_subhead, takeaways, deal_stats_html, body_html, byline_html)
  - The angles you previously surfaced for David
  - David's free-form response — his operator take on this deal, possibly addressing only some angles
  - The full listing data for context

YOUR JOB: Return the SAME JSON shape for Tape 3, but updated to weave David's voice into the article.

Concretely:
  - If David provided a headline or trade range, replace the [ATLAS HEADLINE] / [TRADE RANGE: ...] placeholders with his exact words (preserving the *italic* asterisk convention if any).
  - Replace each [ATLAS READ: hint] placeholder in body_html with a one-line operator take pulled from David's response.
  - Replace [BROKER TAG NOTE] in body_html if David said anything about the broker.
  - If his response includes a "where this trades" verdict, weave it into the body_html section about valuation.
  - If he reacted to a specific angle (soft-story, financing, broker behavior), strengthen the corresponding body section with his actual words.
  - Do NOT lose anything from the existing draft. Update in place, don't rewrite from scratch.
  - Do NOT use em-dashes. Use commas, periods, or parentheses.
  - Preserve the same JSON shape exactly.

Return ONLY the JSON, no surrounding prose, no markdown fences.

Schema:
\`\`\`
{
  "headline": string,
  "deck": string,
  "status_tag": string,
  "hero_caption": string,
  "takeaways_subhead": string,
  "takeaways": [{ "bold": string, "text": string }, ...],
  "deal_stats_html": string,
  "body_html": string,
  "byline_html": string
}
\`\`\`
`.trim()

type Tape3 = {
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

export async function POST(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'unauthorized' }, { status: 401 })

  const body = await req.json().catch(() => ({})) as { response?: string }
  const reactionText = (body.response ?? '').trim()
  if (!reactionText) {
    return NextResponse.json({ error: 'response required' }, { status: 400 })
  }

  const { data: article, error: aErr } = await supabase
    .from('articles')
    .select(`
      id, ai_draft, david_reactions,
      listing:listings (
        *,
        property:properties (*),
        listing_broker:brokers!listings_listing_broker_id_fkey (*)
      )
    `)
    .eq('id', id)
    .maybeSingle()
  if (aErr || !article) {
    return NextResponse.json({ error: aErr?.message ?? 'article not found' }, { status: 404 })
  }

  const draft = (article.ai_draft ?? {}) as { tape_3?: Tape3; angles?: string[] }
  if (!draft.tape_3) {
    return NextResponse.json({ error: 'no Tape 3 draft to weave into' }, { status: 400 })
  }

  const reactions = (article.david_reactions ?? {}) as { angles?: string[] }
  const angles = reactions.angles ?? draft.angles ?? []

  const userMessage = `CURRENT TAPE 3 DRAFT:
\`\`\`json
${JSON.stringify(draft.tape_3, null, 2)}
\`\`\`

ANGLES PREVIOUSLY SURFACED FOR DAVID:
${angles.map((a, i) => `${i + 1}. ${a}`).join('\n') || '(none)'}

DAVID'S RESPONSE:
${reactionText}

LISTING DATA (for context, do not invent fields):
\`\`\`json
${JSON.stringify(article.listing, null, 2)}
\`\`\`

Now return the updated Tape 3 JSON, weaving David's voice in.`

  const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY! })
  let resp
  try {
    resp = await anthropic.messages.create({
      model: 'claude-sonnet-4-6',
      max_tokens: 4096,
      // Mark the (static) system prompt as cacheable so re-weaves within the
      // 5-minute TTL skip re-processing the long instruction block. The first
      // weave pays the write cost; every subsequent weave on the same article
      // reads from cache (faster + cheaper).
      system: [
        { type: 'text', text: WEAVE_INSTRUCTIONS, cache_control: { type: 'ephemeral' } },
      ],
      messages: [{ role: 'user', content: userMessage }],
    })
  } catch (e) {
    return NextResponse.json(
      { error: `anthropic error: ${e instanceof Error ? e.message : String(e)}` },
      { status: 500 }
    )
  }

  const text = resp.content
    .filter((b): b is Anthropic.TextBlock => b.type === 'text')
    .map(b => b.text)
    .join('')
  const cleaned = text.replace(/^```(?:json)?\s*/i, '').replace(/\s*```\s*$/i, '').trim()

  let updatedTape3: Tape3
  try {
    updatedTape3 = JSON.parse(cleaned)
  } catch (e) {
    return NextResponse.json(
      { error: `AI did not return valid JSON: ${e instanceof Error ? e.message : String(e)}`, rawOutput: text.slice(0, 2000) },
      { status: 502 }
    )
  }

  // Merge the updated tape_3 back into the full ai_draft.
  const nextDraft = { ...draft, tape_3: updatedTape3 }
  const nextReactions = {
    angles,
    response: reactionText,
    recorded_at: new Date().toISOString(),
  }

  const { error: updErr } = await supabase
    .from('articles')
    .update({
      ai_draft: nextDraft as unknown as never,
      david_reactions: nextReactions as unknown as never,
      headline: updatedTape3.headline,
      deck: updatedTape3.deck,
    })
    .eq('id', id)
  if (updErr) {
    return NextResponse.json({ error: `update error: ${updErr.message}` }, { status: 500 })
  }

  return NextResponse.json({
    ok: true,
    usage: { input_tokens: resp.usage.input_tokens, output_tokens: resp.usage.output_tokens },
  })
}
