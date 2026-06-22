import Anthropic from '@anthropic-ai/sdk'
import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

export const maxDuration = 120

const client = new Anthropic()

// Enrich a broker from a chunk of text pasted off the broker's firm website (or
// an email signature, LinkedIn, etc.). CoStar already gives us name/firm/phone/
// email/DRE on parse; this fills in the richer profile fields David can't get
// from CoStar. We only EXTRACT here — the caller previews the proposed values
// and chooses what to save, so a stray paste can never silently clobber good
// data. Return null for anything not present; never invent.
const SYSTEM_PROMPT = `You extract a single commercial real estate broker's profile from pasted text (a brokerage website bio, email signature, LinkedIn, or directory page). Return ONLY a JSON object with these fields, using null for anything not clearly present. Do not guess or fabricate.

{
  "name": string,            // full name
  "title": string,           // e.g. "Senior Managing Director", "Partner"
  "firm": string,            // brokerage / company name
  "team": string,            // team or group name within the firm, if any
  "phone": string,           // primary/office phone, digits and formatting as shown
  "cell": string,            // mobile, if distinct from phone
  "email": string,           // lowercased
  "dre_license": string,     // CA DRE / BRE license number (digits only)
  "office_address": string,  // office mailing address, single line
  "linkedin": string,        // full LinkedIn URL
  "profile_url": string,     // the broker's profile page URL on the firm site
  "focus_areas": string[],   // specialties, e.g. ["Multifamily", "Westside LA"]
  "start_year": number,      // year they started in the industry, if stated
  "years_active": number,    // years of experience, if stated as a number
  "volume_closed": string,   // career or annual transaction volume, verbatim (e.g. "$1.2B")
  "bio": string              // a short narrative bio paragraph if present, trimmed
}

Rules:
- Numbers (start_year, years_active) are numeric, not strings.
- Phone/cell: keep as shown but strip labels like "O:" / "M:".
- email lowercased. dre_license digits only (strip "DRE #").
- focus_areas: short tags, omit if none clearly listed.
- Return only valid JSON, no markdown, no commentary.`

function parseJson(text: string): Record<string, unknown> {
  const raw = text.replace(/^```(?:json)?\n?/i, '').replace(/\n?```$/i, '').trim()
  return JSON.parse(raw)
}

export async function POST(request: NextRequest) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  let text: string
  try {
    const body = await request.json()
    text = typeof body?.text === 'string' ? body.text : ''
  } catch {
    return NextResponse.json({ error: 'Invalid request.' }, { status: 400 })
  }
  if (!text.trim()) {
    return NextResponse.json({ error: 'No text provided.' }, { status: 400 })
  }

  try {
    const response = await client.messages.create({
      model: 'claude-sonnet-4-6',
      max_tokens: 2048,
      messages: [
        { role: 'user', content: `${SYSTEM_PROMPT}\n\nText to parse:\n${text}` },
      ],
    })
    const content = response.content[0]
    if (content.type !== 'text') throw new Error('Unexpected response type')
    const proposed = parseJson(content.text)
    return NextResponse.json({ proposed })
  } catch (e) {
    const message = e instanceof Error ? e.message : 'Parse failed'
    return NextResponse.json({ error: `Parse failed: ${message}` }, { status: 500 })
  }
}
