import Anthropic from '@anthropic-ai/sdk'
import type { ContentBlockParam, Base64PDFSource } from '@anthropic-ai/sdk/resources'
import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import type { Database } from '@/lib/db/types'
import { OM_PROMPT } from '@/lib/db/om-prompt'
import {
  createListingFromOm,
  augmentListingFromOm,
  type OMPayload,
} from '@/lib/db/om-merge'

export const maxDuration = 60

const client = new Anthropic()

function stripFences(text: string): string {
  return text.replace(/^```(?:json)?\n?/i, '').replace(/\n?```$/i, '').trim()
}

async function parseOmPdf(file: File): Promise<OMPayload> {
  const bytes = await file.arrayBuffer()
  const base64 = Buffer.from(bytes).toString('base64')

  const response = await client.messages.create({
    model: 'claude-sonnet-4-6',
    max_tokens: 16384,
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
          { type: 'text', text: OM_PROMPT } as ContentBlockParam,
        ],
      },
    ],
  })

  const content = response.content[0]
  if (content.type !== 'text') throw new Error('Unexpected response type')
  return JSON.parse(stripFences(content.text)) as OMPayload
}

export async function POST(request: NextRequest) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const contentType = request.headers.get('content-type') || ''
  if (!contentType.includes('multipart/form-data')) {
    return NextResponse.json({ error: 'Expected multipart/form-data' }, { status: 400 })
  }

  const formData = await request.formData()
  const file = formData.get('pdf') as File | null
  const listingIdRaw = formData.get('listing_id')
  const listingId = typeof listingIdRaw === 'string' && listingIdRaw.trim() !== '' ? listingIdRaw : null

  if (!file) {
    return NextResponse.json({ error: 'No PDF provided' }, { status: 400 })
  }

  let payload: OMPayload
  try {
    payload = await parseOmPdf(file)
  } catch (e) {
    const msg = e instanceof Error ? e.message : 'Parse failed'
    return NextResponse.json({ error: `Parse failed: ${msg}` }, { status: 500 })
  }

  // mode 1: create new listing
  if (!listingId) {
    try {
      const result = await createListingFromOm(supabase, payload)

      const logRow: Database['public']['Tables']['augmentation_log']['Insert'] = {
        listing_id: result.listingId,
        property_id: result.propertyId,
        augment_type: 'om_create',
        raw_text: `[OM PDF: ${file.name}, ${file.size} bytes]`,
        parsed_payload: payload as Database['public']['Tables']['augmentation_log']['Insert']['parsed_payload'],
        fields_changed: { mode: 'create', existing_listings_for_property: result.existingListingsForProperty } as Database['public']['Tables']['augmentation_log']['Insert']['fields_changed'],
        created_by: user.id,
      }
      await supabase.from('augmentation_log').insert(logRow)

      return NextResponse.json({
        mode: 'create',
        listing_id: result.listingId,
        property_id: result.propertyId,
        existing_listings_for_property: result.existingListingsForProperty,
        parsed: payload,
      })
    } catch (e) {
      const msg = e instanceof Error ? e.message : 'Create failed'
      return NextResponse.json({ error: `Create failed: ${msg}`, parsed: payload }, { status: 500 })
    }
  }

  // mode 2: augment existing listing
  try {
    const fieldsChanged = await augmentListingFromOm(supabase, { listingId, om: payload })

    const logRow: Database['public']['Tables']['augmentation_log']['Insert'] = {
      listing_id: listingId,
      property_id: null,
      augment_type: 'om',
      raw_text: `[OM PDF: ${file.name}, ${file.size} bytes]`,
      parsed_payload: payload as Database['public']['Tables']['augmentation_log']['Insert']['parsed_payload'],
      fields_changed: fieldsChanged as Database['public']['Tables']['augmentation_log']['Insert']['fields_changed'],
      created_by: user.id,
    }
    await supabase.from('augmentation_log').insert(logRow)

    return NextResponse.json({
      mode: 'augment',
      listing_id: listingId,
      fields_changed: fieldsChanged,
      parsed: payload,
    })
  } catch (e) {
    const msg = e instanceof Error ? e.message : 'Augment failed'
    return NextResponse.json({ error: `Augment failed: ${msg}`, parsed: payload }, { status: 500 })
  }
}
