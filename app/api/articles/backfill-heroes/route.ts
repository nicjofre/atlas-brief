import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

// One-time batch: give every article brief older than 18 hours a default Google
// hero — Street View where there's coverage (north-facing; David refines the
// angle by hand), satellite otherwise. Overwrites the existing hero. Idempotent:
// skips briefs already carrying a backfilled Google asset. Runs as the signed-in
// admin (RLS-permitted), so no service-role key needed.

export const maxDuration = 300
export const dynamic = 'force-dynamic'

const KEY = process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY
const REFERER = 'https://atlasbrief.la/'
const STALE_MS = 18 * 60 * 60 * 1000

function svUrl(loc: string) {
  const p = new URLSearchParams({ size: '640x384', location: loc, heading: '0', fov: '80', pitch: '0', key: KEY! })
  return `https://maps.googleapis.com/maps/api/streetview?${p}`
}
function satUrl(loc: string) {
  const p = new URLSearchParams({ center: loc, zoom: '19', size: '640x384', scale: '2', maptype: 'satellite', key: KEY! })
  return `https://maps.googleapis.com/maps/api/staticmap?${p}`
}
async function hasStreetView(loc: string) {
  const meta = await fetch(`https://maps.googleapis.com/maps/api/streetview/metadata?location=${encodeURIComponent(loc)}&key=${KEY}`, { headers: { Referer: REFERER } })
    .then(r => r.json()).catch(() => null)
  return meta?.status === 'OK'
}

export async function POST() {
  if (!KEY) return NextResponse.json({ error: 'Maps key not configured' }, { status: 500 })
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Not authenticated' }, { status: 401 })

  const cutoff = new Date(Date.now() - STALE_MS).toISOString()
  const { data: articles, error } = await supabase
    .from('articles')
    .select('id, hero_photo_url, listing:listings (property:properties (lat, lng, street_address, city, state))')
    .lt('updated_at', cutoff)
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  const result = {
    total: articles?.length ?? 0,
    streetview: 0,
    satellite: 0,
    alreadyDone: 0,
    skippedNoLocation: 0,
    errors: [] as { id: string; error: string }[],
  }

  for (const a of articles ?? []) {
    try {
      if (typeof a.hero_photo_url === 'string' && a.hero_photo_url.includes('hero-google-')) {
        result.alreadyDone++
        continue
      }
      const prop = (a.listing as {
        property?: { lat: number | null; lng: number | null; street_address: string | null; city: string | null; state: string | null }
      } | null)?.property
      const loc = prop?.lat != null && prop?.lng != null
        ? `${prop.lat},${prop.lng}`
        : [prop?.street_address, prop?.city, prop?.state].filter(Boolean).join(', ')
      if (!loc) { result.skippedNoLocation++; continue }

      const useSV = await hasStreetView(loc)
      const source = useSV ? 'streetview' : 'satellite'
      const res = await fetch(useSV ? svUrl(loc) : satUrl(loc), { headers: { Referer: REFERER } })
      if (!res.ok) throw new Error(`Google ${res.status}`)
      const bytes = Buffer.from(await res.arrayBuffer())

      const path = `articles/${a.id}/hero-google-${source}-${Date.now()}.jpg`
      const { error: upErr } = await supabase.storage.from('property-assets').upload(path, bytes, { contentType: 'image/jpeg', upsert: false })
      if (upErr) throw new Error(`upload: ${upErr.message}`)
      const { data: { publicUrl } } = supabase.storage.from('property-assets').getPublicUrl(path)
      const { error: updErr } = await supabase.from('articles').update({ hero_photo_url: publicUrl }).eq('id', a.id)
      if (updErr) throw new Error(`update: ${updErr.message}`)

      if (useSV) result.streetview++
      else result.satellite++
    } catch (e) {
      result.errors.push({ id: a.id, error: e instanceof Error ? e.message : 'failed' })
    }
  }

  return NextResponse.json(result)
}
