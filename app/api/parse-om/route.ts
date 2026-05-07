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

async function parseOmFromBase64(base64: string): Promise<OMPayload> {
  const response = await client.messages.create({
    model: 'claude-haiku-4-5',
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

async function parseOmPdfFile(file: File): Promise<OMPayload> {
  const bytes = await file.arrayBuffer()
  const base64 = Buffer.from(bytes).toString('base64')
  return parseOmFromBase64(base64)
}

export async function POST(request: NextRequest) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const contentType = request.headers.get('content-type') || ''

  let file: File | null = null
  let storagePath: string | null = null
  let storageFileName: string | null = null
  let storageFileSize: number | null = null
  let listingId: string | null = null

  if (contentType.includes('application/json')) {
    // path-based: client uploaded PDF to Supabase Storage first, sends the path here
    const body = await request.json().catch(() => null)
    if (!body) return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 })
    storagePath = typeof body.path === 'string' ? body.path : null
    storageFileName = typeof body.file_name === 'string' ? body.file_name : storagePath
    storageFileSize = typeof body.file_size === 'number' ? body.file_size : null
    listingId = typeof body.listing_id === 'string' && body.listing_id.trim() !== '' ? body.listing_id : null
    if (!storagePath) {
      return NextResponse.json({ error: 'Missing path' }, { status: 400 })
    }
  } else if (contentType.includes('multipart/form-data')) {
    // legacy: small PDFs sent inline (subject to Vercel 4.5MB body limit)
    const formData = await request.formData()
    file = formData.get('pdf') as File | null
    const listingIdRaw = formData.get('listing_id')
    listingId = typeof listingIdRaw === 'string' && listingIdRaw.trim() !== '' ? listingIdRaw : null
    if (!file) {
      return NextResponse.json({ error: 'No PDF provided' }, { status: 400 })
    }
  } else {
    return NextResponse.json({ error: 'Expected JSON or multipart/form-data' }, { status: 400 })
  }

  let payload: OMPayload
  try {
    if (storagePath) {
      const { data: blob, error } = await supabase.storage.from('om-uploads').download(storagePath)
      if (error || !blob) {
        return NextResponse.json({ error: `Storage download failed: ${error?.message ?? 'no blob'}` }, { status: 500 })
      }
      const bytes = await blob.arrayBuffer()
      const base64 = Buffer.from(bytes).toString('base64')
      payload = await parseOmFromBase64(base64)
    } else if (file) {
      payload = await parseOmPdfFile(file)
    } else {
      return NextResponse.json({ error: 'No PDF provided' }, { status: 400 })
    }
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
        raw_text: `[OM PDF: ${file?.name ?? storageFileName ?? 'unknown'}, ${file?.size ?? storageFileSize ?? 0} bytes${storagePath ? `, storage:${storagePath}` : ''}]`,
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
      raw_text: `[OM PDF: ${file?.name ?? storageFileName ?? 'unknown'}, ${file?.size ?? storageFileSize ?? 0} bytes${storagePath ? `, storage:${storagePath}` : ''}]`,
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
