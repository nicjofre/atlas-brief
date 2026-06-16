import { NextResponse } from 'next/server'
import Anthropic from '@anthropic-ai/sdk'
import { createClient } from '@/lib/supabase/server'

export const runtime = 'nodejs'
export const maxDuration = 120

// A final copy-edit pass over the article the editor is about to publish.
// Checks against the SAME house style/rules used for drafting (the editable
// `style_guide` and `hard_rules` prompts), so it stays in sync with whatever
// David tunes in /admin/prompts. Returns advisory findings — never blocks.

type Finding = {
  severity: 'high' | 'low'
  location: 'headline' | 'deck' | 'body'
  quote: string
  issue: string
  suggestion: string
}

const INSTRUCTIONS = `
You are the final copy editor for Atlas Brief, a Los Angeles real estate trade publication. You are handed a draft (headline, deck, body) that is about to be published. Your job is to catch problems a careful editor would catch on a last read-through.

Return ONLY JSON, no prose, no markdown fences, in exactly this shape:
{ "findings": [ { "severity": "high" | "low", "location": "headline" | "deck" | "body", "quote": "<exact offending text>", "issue": "<short plain description>", "suggestion": "<the fix>" } ] }

Severity:
- "high" = never intentional or credibility-damaging: a leftover bracketed placeholder (e.g. [ATLAS HEADLINE], [TRADE RANGE], [ATLAS READ], [BROKER TAG NOTE], or ANY [bracketed] text), a typo or wrong/garbled number in the HEADLINE, or two numbers that contradict each other (e.g. headline says $388K but body says $389K).
- "low" = body-level nits: a small typo, a house-style formatting slip, an awkward run-together, stray punctuation.

What to check for:
- Spelling typos (e.g. "Buidling" should be "Building").
- Any leftover [bracketed] placeholder text anywhere.
- Internal inconsistencies between headline, deck, and body (prices, unit counts, addresses).
- Words run together or a number jammed against a word (e.g. "FIGat7th", "2019West").
- Stray or doubled periods, double spaces, em-dashes (—).
- Violations of the HOUSE RULES below (money/GRM/cap/$ per SF formatting, banned words, etc.).

Be precise and conservative: only flag REAL problems, quote the exact text, and do NOT invent issues or nitpick legitimate editorial choices. If the draft is clean, return { "findings": [] }.

===== HOUSE RULES =====
`.trim()

export async function POST(req: Request, { params }: { params: Promise<{ id: string }> }) {
  await params // id not needed; content comes from the request (may be unsaved edits)
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'unauthorized' }, { status: 401 })

  const body = await req.json().catch(() => ({})) as {
    headline?: string
    deck?: string
    body_html?: string
  }
  const headline = (body.headline ?? '').trim()
  const deck = (body.deck ?? '').trim()
  const bodyHtml = (body.body_html ?? '').trim()
  if (!headline && !deck && !bodyHtml) {
    return NextResponse.json({ error: 'nothing to proofread' }, { status: 400 })
  }

  // Pull the editable house-style criteria so the proofread matches drafting.
  const { data: promptRows } = await supabase
    .from('prompts')
    .select('key, body')
    .in('key', ['hard_rules', 'style_guide'])
  const rules = (promptRows ?? [])
    .map(r => `## ${r.key}\n${r.body}`)
    .join('\n\n') || '(no house rules configured)'

  const systemText = `${INSTRUCTIONS}\n${rules}`

  const userMessage = `HEADLINE:\n${headline || '(empty)'}\n\nDECK:\n${deck || '(empty)'}\n\nBODY (HTML):\n${bodyHtml || '(empty)'}`

  const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY! })
  let resp
  try {
    resp = await anthropic.messages.create({
      model: 'claude-sonnet-4-6',
      max_tokens: 2048,
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

  let findings: Finding[]
  try {
    const parsed = JSON.parse(cleaned)
    findings = Array.isArray(parsed?.findings) ? parsed.findings : []
  } catch {
    return NextResponse.json(
      { error: 'proofreader did not return valid JSON', rawOutput: text.slice(0, 1500) },
      { status: 502 },
    )
  }

  return NextResponse.json({
    findings,
    usage: { input_tokens: resp.usage.input_tokens, output_tokens: resp.usage.output_tokens },
  })
}
