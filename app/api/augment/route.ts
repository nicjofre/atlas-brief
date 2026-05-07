import Anthropic from '@anthropic-ai/sdk'
import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import type { Database } from '@/lib/db/types'
import { CONTACTS_PROMPT, PUBLIC_RECORD_PROMPT, LOAN_PROMPT } from '@/lib/db/augment-prompts'
import {
  mergeContacts,
  mergePublicRecord,
  mergeLoan,
  type ContactsPayload,
  type PublicRecordPayload,
  type LoanPayload,
  type FieldsChanged,
} from '@/lib/db/augment-merge'

export const maxDuration = 300

const client = new Anthropic()

type AugmentType = 'contacts' | 'public_record' | 'loan'

function promptFor(type: AugmentType): string {
  switch (type) {
    case 'contacts':
      return CONTACTS_PROMPT
    case 'public_record':
      return PUBLIC_RECORD_PROMPT
    case 'loan':
      return LOAN_PROMPT
  }
}

function stripFences(text: string): string {
  return text.replace(/^```(?:json)?\n?/i, '').replace(/\n?```$/i, '').trim()
}

export async function POST(request: NextRequest) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const body = await request.json().catch(() => null)
  if (!body) return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 })

  const { listing_id, type, text } = body as {
    listing_id?: string
    type?: AugmentType
    text?: string
  }

  if (!listing_id || !type || !text?.trim()) {
    return NextResponse.json({ error: 'Missing listing_id, type, or text' }, { status: 400 })
  }
  if (!['contacts', 'public_record', 'loan'].includes(type)) {
    return NextResponse.json({ error: 'Invalid augment type' }, { status: 400 })
  }

  const { data: listing, error: listingError } = await supabase
    .from('listings')
    .select('id, property_id')
    .eq('id', listing_id)
    .maybeSingle()

  if (listingError || !listing) {
    return NextResponse.json({ error: 'Listing not found' }, { status: 404 })
  }

  // call Claude
  let parsedPayload: ContactsPayload | PublicRecordPayload | LoanPayload
  try {
    const response = await client.messages.create({
      model: 'claude-sonnet-4-6',
      max_tokens: 8192,
      messages: [
        { role: 'user', content: `${promptFor(type)}\n\nText to parse:\n${text}` },
      ],
    })
    const content = response.content[0]
    if (content.type !== 'text') throw new Error('Unexpected response type')
    parsedPayload = JSON.parse(stripFences(content.text))
  } catch (e) {
    const msg = e instanceof Error ? e.message : 'Parse failed'
    return NextResponse.json({ error: `Parse failed: ${msg}` }, { status: 500 })
  }

  // merge
  let fieldsChanged: FieldsChanged = {}
  try {
    if (type === 'contacts') {
      fieldsChanged = await mergeContacts(supabase, {
        listingId: listing.id,
        propertyId: listing.property_id,
        payload: parsedPayload as ContactsPayload,
      })
    } else if (type === 'public_record') {
      fieldsChanged = await mergePublicRecord(supabase, {
        propertyId: listing.property_id,
        payload: parsedPayload as PublicRecordPayload,
      })
    } else {
      fieldsChanged = await mergeLoan(supabase, {
        propertyId: listing.property_id,
        payload: parsedPayload as LoanPayload,
      })
    }
  } catch (e) {
    const msg = e instanceof Error ? e.message : 'Merge failed'
    return NextResponse.json({ error: `Merge failed: ${msg}`, parsed: parsedPayload }, { status: 500 })
  }

  // log
  const logRow: Database['public']['Tables']['augmentation_log']['Insert'] = {
    listing_id: listing.id,
    property_id: listing.property_id,
    augment_type: type,
    raw_text: text,
    parsed_payload: parsedPayload as Database['public']['Tables']['augmentation_log']['Insert']['parsed_payload'],
    fields_changed: fieldsChanged as Database['public']['Tables']['augmentation_log']['Insert']['fields_changed'],
    created_by: user.id,
  }
  const { error: logError } = await supabase.from('augmentation_log').insert(logRow)

  if (logError) {
    // don't fail the request — merge already happened. Just report it.
    return NextResponse.json({
      fields_changed: fieldsChanged,
      parsed: parsedPayload,
      log_error: logError.message,
    })
  }

  return NextResponse.json({ fields_changed: fieldsChanged, parsed: parsedPayload })
}
