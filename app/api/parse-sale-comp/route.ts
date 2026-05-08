import Anthropic from '@anthropic-ai/sdk'
import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import type { Database } from '@/lib/db/types'
import { SALE_COMP_PROMPT } from '@/lib/db/sale-comp-prompt'
import {
  createListingFromSaleComp,
  augmentListingFromSaleComp,
  type SaleCompPayload,
} from '@/lib/db/sale-comp-merge'

export const maxDuration = 300

const client = new Anthropic()

function stripFences(text: string): string {
  return text.replace(/^```(?:json)?\n?/i, '').replace(/\n?```$/i, '').trim()
}

async function parseSaleComp(text: string): Promise<SaleCompPayload> {
  const response = await client.messages.create({
    model: 'claude-haiku-4-5',
    max_tokens: 8192,
    messages: [
      { role: 'user', content: `${SALE_COMP_PROMPT}\n\nText to parse:\n${text}` },
    ],
  })
  const content = response.content[0]
  if (content.type !== 'text') throw new Error('Unexpected response type')
  return JSON.parse(stripFences(content.text)) as SaleCompPayload
}

export async function POST(request: NextRequest) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const body = await request.json().catch(() => null)
  if (!body) return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 })

  const text = typeof body.text === 'string' ? body.text : null
  const listingId = typeof body.listing_id === 'string' && body.listing_id.trim() !== '' ? body.listing_id : null

  if (!text?.trim()) {
    return NextResponse.json({ error: 'Missing text' }, { status: 400 })
  }

  let payload: SaleCompPayload
  try {
    payload = await parseSaleComp(text)
  } catch (e) {
    const msg = e instanceof Error ? e.message : 'Parse failed'
    return NextResponse.json({ error: `Parse failed: ${msg}` }, { status: 500 })
  }

  // Mode 1: create
  if (!listingId) {
    try {
      const result = await createListingFromSaleComp(supabase, payload)
      const logRow: Database['public']['Tables']['augmentation_log']['Insert'] = {
        listing_id: result.listingId,
        property_id: result.propertyId,
        augment_type: 'sale_comp_create',
        raw_text: text.slice(0, 100000),
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

  // Mode 2: augment
  try {
    const fieldsChanged = await augmentListingFromSaleComp(supabase, { listingId, payload })
    const logRow: Database['public']['Tables']['augmentation_log']['Insert'] = {
      listing_id: listingId,
      property_id: null,
      augment_type: 'sale_comp',
      raw_text: text.slice(0, 100000),
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
