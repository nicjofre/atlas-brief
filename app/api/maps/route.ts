import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

// Proxy for Google Maps preview images (Street View + Static satellite) used in
// the article editor. Serving these through our own origin means the browser
// never calls maps.googleapis.com directly, so ad/privacy blockers, network
// filters, and referrer rules can't break the previews — and the API key stays
// entirely server-side (never shipped to the client).
//
// Auth-gated: only signed-in editors can spend the Maps quota. The published
// hero is a stored copy (see hero-from-google), not this proxy.

const KEY = process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY
const REFERER = 'https://atlasbrief.la/'

function clampInt(v: string | null, lo: number, hi: number, dflt: number) {
  const n = Number(v)
  return Number.isFinite(n) ? Math.min(hi, Math.max(lo, Math.round(n))) : dflt
}

export async function GET(req: Request) {
  if (!KEY) return NextResponse.json({ error: 'Maps key not configured' }, { status: 500 })

  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Not authenticated' }, { status: 401 })

  const q = new URL(req.url).searchParams
  const t = q.get('t')
  const size = /^\d{1,4}x\d{1,4}$/.test(q.get('s') || '') ? q.get('s')! : '640x384'

  let googleUrl: string
  if (t === 'sv') {
    const loc = q.get('loc')
    if (!loc) return NextResponse.json({ error: 'Missing location' }, { status: 400 })
    const p = new URLSearchParams({
      size,
      location: loc,
      heading: String(clampInt(q.get('h'), 0, 359, 0)),
      fov: String(clampInt(q.get('f'), 10, 120, 80)),
      pitch: String(clampInt(q.get('p'), -90, 90, 0)),
      key: KEY,
    })
    googleUrl = `https://maps.googleapis.com/maps/api/streetview?${p}`
  } else if (t === 'sat') {
    const center = q.get('c')
    if (!center) return NextResponse.json({ error: 'Missing center' }, { status: 400 })
    const p = new URLSearchParams({
      center,
      zoom: String(clampInt(q.get('z'), 1, 21, 19)),
      size,
      scale: '2',
      maptype: 'satellite',
      key: KEY,
    })
    const marker = q.get('m')
    if (q.get('pin') === '1' && marker) p.set('markers', `color:red|${marker}`)
    googleUrl = `https://maps.googleapis.com/maps/api/staticmap?${p}`
  } else {
    return NextResponse.json({ error: 'Invalid type' }, { status: 400 })
  }

  const res = await fetch(googleUrl, { headers: { Referer: REFERER } })
  if (!res.ok) return NextResponse.json({ error: `Google returned ${res.status}` }, { status: 502 })

  const bytes = Buffer.from(await res.arrayBuffer())
  return new NextResponse(bytes, {
    status: 200,
    headers: {
      'Content-Type': res.headers.get('content-type') || 'image/jpeg',
      // Private (auth-gated) but cache per-session so hovering the picker
      // doesn't re-hit Google for the same angle.
      'Cache-Control': 'private, max-age=3600',
    },
  })
}
