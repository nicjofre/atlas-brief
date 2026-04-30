import Anthropic from '@anthropic-ai/sdk'
import { NextRequest, NextResponse } from 'next/server'

const client = new Anthropic()

export async function POST(request: NextRequest) {
  const { text } = await request.json()

  if (!text?.trim()) {
    return NextResponse.json({ error: 'No text provided' }, { status: 400 })
  }

  const message = await client.messages.create({
    model: 'claude-sonnet-4-6',
    max_tokens: 1024,
    messages: [
      {
        role: 'user',
        content: `You are a commercial real estate data parser. Extract structured deal data from the following CoStar export or listing text. Return a JSON object with these fields (use null for any field not found):

{
  "address": string,
  "neighborhood": string,
  "city": string,
  "year_built": number,
  "unit_count": number,
  "bedroom_mix": string,
  "building_sf": number,
  "lot_size": string,
  "apn": string,
  "parking": string,
  "list_price": number,
  "sale_price": number,
  "price_per_door": number,
  "price_per_sf": number,
  "cap_rate": number,
  "grm": number,
  "last_sale_date": string,
  "last_sale_price": number,
  "broker_name": string,
  "broker_firm": string,
  "broker_phone": string,
  "broker_email": string,
  "broker_license": string,
  "mls_number": string,
  "status": "for_sale" | "sold",
  "value_add_notes": string,
  "soft_story_retrofit": boolean | null,
  "capital_improvements": string
}

Return only valid JSON, no explanation.

Text to parse:
${text}`,
      },
    ],
  })

  const content = message.content[0]
  if (content.type !== 'text') {
    return NextResponse.json({ error: 'Unexpected response' }, { status: 500 })
  }

  try {
    const parsed = JSON.parse(content.text)
    return NextResponse.json({ deal: parsed })
  } catch {
    return NextResponse.json({ error: 'Failed to parse response', raw: content.text }, { status: 500 })
  }
}
