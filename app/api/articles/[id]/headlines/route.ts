import { NextResponse } from 'next/server'
import Anthropic from '@anthropic-ai/sdk'
import { createClient } from '@/lib/supabase/server'

export const runtime = 'nodejs'
export const maxDuration = 120

// Headline generator for the article editor. After David writes the article he
// clicks "Headlines" and gets a few options to choose from. The generation
// guidance lives in the editable `headline_generator` prompt (also tunable in
// /admin/prompts and inline in the editor); house style (voice/style_guide/
// hard_rules) is appended so headlines match the rest of the publication. The
// JSON output contract is fixed here so editing the prompt can't break parsing.

const FALLBACK_PROMPT = `You write headline options for Atlas Brief, a Los Angeles real estate trade publication, given an article David has drafted (its working headline, deck, and body).

Propose 5 distinct headline options that are sharp, specific, grounded in the deal's numbers or angle, in the house voice (Matt Levine meets trade journal), tight (under ~12 words), no questions, and varied in angle.`

const OUTPUT_CONTRACT = `
Return ONLY JSON, no prose, no markdown fences, in exactly this shape:
{ "headlines": ["<option 1>", "<option 2>", "<option 3>", "<option 4>", "<option 5>"] }
Provide 5 options. Each is a single plain-text headline (no surrounding quotes, no numbering).`.trim()

export async function POST(req: Request, { params }: { params: Promise<{ id: string }> }) {
  await params // id not needed; content comes from the request (may be unsaved edits)
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'unauthorized' }, { status: 401 })

  const body = (await req.json().catch(() => ({}))) as {
    headline?: string
    deck?: string
    body_html?: string
    prompt?: string
  }
  const headline = (body.headline ?? '').trim()
  const deck = (body.deck ?? '').trim()
  const bodyHtml = (body.body_html ?? '').trim()
  if (!deck && !bodyHtml) {
    return NextResponse.json({ error: 'Write the article first — there is nothing to headline yet.' }, { status: 400 })
  }

  // The editable guidance: an inline override from the editor, else the stored
  // prompt, else the built-in fallback.
  let guidance = (body.prompt ?? '').trim()
  if (!guidance) {
    const { data: row } = await supabase
      .from('prompts')
      .select('body')
      .eq('key', 'headline_generator')
      .maybeSingle()
    guidance = (row?.body ?? '').trim() || FALLBACK_PROMPT
  }

  // House style so headlines match drafting + the proofread pass.
  const { data: promptRows } = await supabase
    .from('prompts')
    .select('key, body')
    .in('key', ['voice', 'style_guide', 'hard_rules'])
  const rules = (promptRows ?? [])
    .map(r => `## ${r.key}\n${r.body}`)
    .join('\n\n') || '(no house rules configured)'

  const systemText = `${guidance}\n\n===== HOUSE RULES =====\n${rules}\n\n===== OUTPUT =====\n${OUTPUT_CONTRACT}`
  const userMessage = `WORKING HEADLINE:\n${headline || '(none yet)'}\n\nDECK:\n${deck || '(empty)'}\n\nBODY (HTML):\n${bodyHtml || '(empty)'}`

  const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY! })
  let resp
  try {
    resp = await anthropic.messages.create({
      model: 'claude-sonnet-4-6',
      max_tokens: 1024,
      system: [{ type: 'text', text: systemText, cache_control: { type: 'ephemeral' } }],
      messages: [{ role: 'user', content: userMessage }],
    })
  } catch (e) {
    return NextResponse.json(
      { error: `anthropic error: ${e instanceof Error ? e.message : String(e)}` },
      { status: 500 },
    )
  }

  const text = resp.content
    .filter((b): b is Anthropic.TextBlock => b.type === 'text')
    .map(b => b.text)
    .join('')
  const cleaned = text.replace(/^```(?:json)?\s*/i, '').replace(/\s*```\s*$/i, '').trim()

  let headlines: string[]
  try {
    const parsed = JSON.parse(cleaned)
    headlines = Array.isArray(parsed?.headlines)
      ? parsed.headlines.filter((h: unknown): h is string => typeof h === 'string' && h.trim().length > 0).map((h: string) => h.trim())
      : []
  } catch {
    return NextResponse.json(
      { error: 'Generator did not return valid JSON.', rawOutput: text.slice(0, 1500) },
      { status: 502 },
    )
  }

  return NextResponse.json({
    headlines,
    usage: { input_tokens: resp.usage.input_tokens, output_tokens: resp.usage.output_tokens },
  })
}
