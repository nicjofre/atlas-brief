import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

// Pull a Google Street View or Satellite image for the article's property,
// store a copy in Supabase storage (property-assets), and set it as the
// article hero. We store a copy rather than hot-linking Google so the published
// page serves a stable asset (no API key in public HTML, no per-view billing).
//
// The Maps key is referrer-restricted for browser use, but Google only checks
// the Referer *header* — a server fetch works either by sending a matching
// Referer or (as tested) with none at all. We send one to be safe.

const KEY = process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY
const REFERER = 'https://atlasbrief.la/'

// Street View Static tops out at 640px; Satellite (Static Maps) supports
// scale=2 for a crisper 1280px-wide hero.
function streetViewUrl(lat: number, lng: number, heading: number) {
  const p = new URLSearchParams({
    size: '640x384',
    location: `${lat},${lng}`,
    heading: String(heading),
    fov: '80',
    pitch: '0',
    key: KEY!,
  })
  return `https://maps.googleapis.com/maps/api/streetview?${p}`
}
function satelliteUrl(lat: number, lng: number) {
  const p = new URLSearchParams({
    center: `${lat},${lng}`,
    zoom: '19',
    size: '640x384',
    scale: '2',
    maptype: 'satellite',
    key: KEY!,
  })
  return `https://maps.googleapis.com/maps/api/staticmap?${p}`
}

export async function POST(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params
  if (!KEY) {
    return NextResponse.json({ error: 'Google Maps key not configured' }, { status: 500 })
  }

  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Not authenticated' }, { status: 401 })

  const body = (await req.json().catch(() => ({}))) as {
    source?: 'streetview' | 'satellite'
    heading?: number
  }
  const source = body.source
  const heading = Number.isFinite(body.heading) ? Math.round(body.heading as number) % 360 : 0
  if (source !== 'streetview' && source !== 'satellite') {
    return NextResponse.json({ error: 'Invalid source' }, { status: 400 })
  }

  // Resolve the property's coordinates from the article's listing.
  const { data: article } = await supabase
    .from('articles')
    .select('id, listing:listings (property:properties (lat, lng))')
    .eq('id', id)
    .maybeSingle()

  const property = (article?.listing as { property?: { lat: number | null; lng: number | null } } | null)?.property
  const lat = property?.lat
  const lng = property?.lng
  if (lat == null || lng == null) {
    return NextResponse.json({ error: 'This property has no coordinates on file' }, { status: 422 })
  }

  // For Street View, verify coverage first so we never store the gray "no
  // imagery" placeholder. Satellite is available everywhere.
  if (source === 'streetview') {
    const metaUrl = `https://maps.googleapis.com/maps/api/streetview/metadata?location=${lat},${lng}&key=${KEY}`
    const meta = await fetch(metaUrl, { headers: { Referer: REFERER } }).then(r => r.json()).catch(() => null)
    if (!meta || meta.status !== 'OK') {
      return NextResponse.json({ error: 'No Street View coverage at this location' }, { status: 422 })
    }
  }

  const imgUrl = source === 'streetview' ? streetViewUrl(lat, lng, heading) : satelliteUrl(lat, lng)
  const res = await fetch(imgUrl, { headers: { Referer: REFERER } })
  if (!res.ok) {
    return NextResponse.json({ error: `Google returned ${res.status}` }, { status: 502 })
  }
  const bytes = Buffer.from(await res.arrayBuffer())

  const path = `articles/${id}/hero-google-${source}-${Date.now()}.jpg`
  const { error: upErr } = await supabase.storage
    .from('property-assets')
    .upload(path, bytes, { contentType: 'image/jpeg', upsert: false })
  if (upErr) {
    return NextResponse.json({ error: `Storage upload failed: ${upErr.message}` }, { status: 500 })
  }

  const { data: { publicUrl } } = supabase.storage.from('property-assets').getPublicUrl(path)
  const { error: updErr } = await supabase
    .from('articles')
    .update({ hero_photo_url: publicUrl })
    .eq('id', id)
  if (updErr) {
    return NextResponse.json({ error: `DB update failed: ${updErr.message}` }, { status: 500 })
  }

  return NextResponse.json({ url: publicUrl })
}
