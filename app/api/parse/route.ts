import Anthropic from '@anthropic-ai/sdk'
import type { ContentBlockParam, Base64PDFSource } from '@anthropic-ai/sdk/resources'
import { NextRequest, NextResponse } from 'next/server'

const client = new Anthropic()

const SYSTEM_PROMPT = `You are a commercial real estate data parser. Extract structured deal data from the provided CoStar report or listing data. Return a JSON object with these fields (use null for any field not found):

{
  "address": string,
  "neighborhood": string,
  "city": string,
  "submarket": string,
  "zoning": string,
  "year_built": number,
  "stories": number,
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
  "noi": number,
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

Return only valid JSON, no explanation.`

function parseResponse(text: string) {
  const raw = text.replace(/^```(?:json)?\n?/i, '').replace(/\n?```$/i, '').trim()
  return JSON.parse(raw)
}

export async function POST(request: NextRequest) {
  const contentType = request.headers.get('content-type') || ''

  // PDF upload
  if (contentType.includes('multipart/form-data')) {
    const formData = await request.formData()
    const file = formData.get('pdf') as File | null

    if (!file) {
      return NextResponse.json({ error: 'No PDF provided' }, { status: 400 })
    }

    const bytes = await file.arrayBuffer()
    const base64 = Buffer.from(bytes).toString('base64')

    const message = await client.messages.create({
      model: 'claude-sonnet-4-6',
      max_tokens: 2048,
      messages: [
        {
          role: 'user',
          content: [
            {
              type: 'document',
              source: {
                type: 'base64',
                media_type: 'application/pdf',
                data: base64,
              } as Base64PDFSource,
            } as ContentBlockParam,
            {
              type: 'text',
              text: SYSTEM_PROMPT,
            } as ContentBlockParam,
          ],
        },
      ],
    })

    const content = message.content[0]
    if (content.type !== 'text') {
      return NextResponse.json({ error: 'Unexpected response' }, { status: 500 })
    }

    try {
      return NextResponse.json({ deal: parseResponse(content.text) })
    } catch {
      return NextResponse.json({ error: 'Failed to parse response', raw: content.text }, { status: 500 })
    }
  }

  // Text paste
  const { text } = await request.json()

  if (!text?.trim()) {
    return NextResponse.json({ error: 'No text provided' }, { status: 400 })
  }

  const message = await client.messages.create({
    model: 'claude-sonnet-4-6',
    max_tokens: 2048,
    messages: [
      {
        role: 'user',
        content: `${SYSTEM_PROMPT}\n\nText to parse:\n${text}`,
      },
    ],
  })

  const content = message.content[0]
  if (content.type !== 'text') {
    return NextResponse.json({ error: 'Unexpected response' }, { status: 500 })
  }

  try {
    return NextResponse.json({ deal: parseResponse(content.text) })
  } catch {
    return NextResponse.json({ error: 'Failed to parse response', raw: content.text }, { status: 500 })
  }
}
