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
// scale=2 for a crisper 1280px-wide hero. `location` is either "lat,lng" or a
// plain address string, which Google geocodes itself.
function streetViewUrl(location: string, heading: number, fov: number, pitch: number) {
  const p = new URLSearchParams({
    size: '640x384',
    location,
    heading: String(heading),
    fov: String(fov),
    pitch: String(pitch),
    key: KEY!,
  })
  return `https://maps.googleapis.com/maps/api/streetview?${p}`
}
function satelliteUrl(center: string, zoom: number, marker: string | null, showPin: boolean) {
  const p = new URLSearchParams({
    center,
    zoom: String(zoom),
    size: '640x384',
    scale: '2',
    maptype: 'satellite',
    key: KEY!,
  })
  // Draw a pin on the exact building when David has placed one.
  if (showPin && marker) p.set('markers', `color:red|${marker}`)
  return `https://maps.googleapis.com/maps/api/staticmap?${p}`
}

const LATLNG_RE = /^-?\d+(\.\d+)?,-?\d+(\.\d+)?$/

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
    fov?: number
    pitch?: number
    zoom?: number
    // Satellite "position on map" mode: an explicit center + pin from the
    // interactive map, so the stored image matches what David framed.
    center?: string
    marker?: string
    showPin?: boolean
  }
  const source = body.source
  const heading = Number.isFinite(body.heading) ? Math.round(body.heading as number) % 360 : 0
  // Clamp to Google's supported ranges.
  const fov = Number.isFinite(body.fov) ? Math.min(120, Math.max(10, Math.round(body.fov as number))) : 80
  const pitch = Number.isFinite(body.pitch) ? Math.min(90, Math.max(-90, Math.round(body.pitch as number))) : 0
  const zoom = Number.isFinite(body.zoom) ? Math.min(21, Math.max(16, Math.round(body.zoom as number))) : 19
  const centerOverride = typeof body.center === 'string' && LATLNG_RE.test(body.center) ? body.center : null
  const marker = typeof body.marker === 'string' && LATLNG_RE.test(body.marker) ? body.marker : null
  const showPin = body.showPin === true
  if (source !== 'streetview' && source !== 'satellite') {
    return NextResponse.json({ error: 'Invalid source' }, { status: 400 })
  }

  // Resolve a location from the article's listing: precise coords if we have
  // them, otherwise the street address (Google geocodes it).
  const { data: article } = await supabase
    .from('articles')
    .select('id, listing:listings (property:properties (id, lat, lng, street_address, city, state))')
    .eq('id', id)
    .maybeSingle()

  const property = (article?.listing as {
    property?: { id: string; lat: number | null; lng: number | null; street_address: string | null; city: string | null; state: string | null }
  } | null)?.property
  const location = property?.lat != null && property?.lng != null
    ? `${property.lat},${property.lng}`
    : [property?.street_address, property?.city, property?.state].filter(Boolean).join(', ')
  // Satellite map mode passes an explicit center, so it doesn't need a stored location.
  if (!location && !centerOverride) {
    return NextResponse.json({ error: 'This property has no address or coordinates on file' }, { status: 422 })
  }

  // For Street View, verify coverage first so we never store the gray "no
  // imagery" placeholder. Satellite is available everywhere.
  if (source === 'streetview') {
    const metaUrl = `https://maps.googleapis.com/maps/api/streetview/metadata?location=${encodeURIComponent(location)}&key=${KEY}`
    const meta = await fetch(metaUrl, { headers: { Referer: REFERER } }).then(r => r.json()).catch(() => null)
    if (!meta || meta.status !== 'OK') {
      return NextResponse.json({ error: 'No Street View coverage at this location' }, { status: 422 })
    }
  }

  const imgUrl = source === 'streetview'
    ? streetViewUrl(location, heading, fov, pitch)
    : satelliteUrl(centerOverride ?? location, zoom, marker, showPin)
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

  // When David drops a pin, persist those exact coordinates to the property so
  // every future Street View / Satellite / map read is precise (not just this
  // article). Best-effort — a failure here shouldn't fail the hero save.
  let savedCoords = false
  if (marker && property?.id) {
    const [mlat, mlng] = marker.split(',').map(Number)
    const { error: coordErr } = await supabase
      .from('properties')
      .update({ lat: mlat, lng: mlng })
      .eq('id', property.id)
    savedCoords = !coordErr
  }

  return NextResponse.json({ url: publicUrl, savedCoords })
}
