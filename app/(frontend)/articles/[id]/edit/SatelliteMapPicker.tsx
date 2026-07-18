'use client'

import { useEffect, useRef, useState } from 'react'

/* eslint-disable @typescript-eslint/no-explicit-any */

const MAPS_KEY = process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY

// Load the Google Maps JS API once, shared across mounts.
let mapsPromise: Promise<any> | null = null
function loadMaps(): Promise<any> {
  const w = window as any
  if (w.google?.maps) return Promise.resolve(w.google.maps)
  if (mapsPromise) return mapsPromise
  mapsPromise = new Promise((resolve, reject) => {
    const s = document.createElement('script')
    s.src = `https://maps.googleapis.com/maps/api/js?key=${MAPS_KEY}&v=weekly`
    s.async = true
    s.onload = () => resolve((window as any).google.maps)
    s.onerror = () => reject(new Error('Could not load Google Maps'))
    document.head.appendChild(s)
  })
  return mapsPromise
}

// Fall back to Street View metadata (already enabled) for a starting point when
// the property has no coordinates yet — no Geocoding API needed.
async function metadataCenter(address: string | null): Promise<{ lat: number; lng: number } | null> {
  if (!address) return null
  try {
    const r = await fetch(`https://maps.googleapis.com/maps/api/streetview/metadata?location=${encodeURIComponent(address)}&key=${MAPS_KEY}`)
    const d = await r.json()
    if (d.status === 'OK' && d.location) return { lat: d.location.lat, lng: d.location.lng }
  } catch { /* ignore */ }
  return null
}

// An interactive satellite map: David pans/zooms and drags a pin onto the exact
// building. On save it stores a satellite hero framed on that pin and persists
// the coordinates to the property.
export default function SatelliteMapPicker({
  articleId,
  address,
  initialLat,
  initialLng,
  onSaved,
  onCancel,
}: {
  articleId: string
  address: string | null
  initialLat: number | null
  initialLng: number | null
  onSaved: (url: string) => void
  onCancel: () => void
}) {
  const mapRef = useRef<HTMLDivElement>(null)
  const mapObj = useRef<any>(null)
  const markerObj = useRef<any>(null)
  const [ready, setReady] = useState(false)
  const [saving, setSaving] = useState(false)
  const [showPin, setShowPin] = useState(true)
  const [err, setErr] = useState<string | null>(null)

  useEffect(() => {
    let cancelled = false
    ;(async () => {
      try {
        const maps = await loadMaps()
        if (cancelled || !mapRef.current) return
        let center = initialLat != null && initialLng != null ? { lat: initialLat, lng: initialLng } : null
        if (!center) center = await metadataCenter(address)
        if (!center) center = { lat: 34.0522, lng: -118.2437 } // LA fallback
        if (cancelled || !mapRef.current) return

        const map = new maps.Map(mapRef.current, {
          center,
          zoom: 19,
          mapTypeId: 'satellite',
          tilt: 0,
          streetViewControl: false,
          fullscreenControl: false,
          mapTypeControl: false,
          rotateControl: false,
        })
        const marker = new maps.Marker({ position: center, map, draggable: true })
        map.addListener('click', (e: any) => marker.setPosition(e.latLng))
        mapObj.current = map
        markerObj.current = marker
        setReady(true)
      } catch (e) {
        setErr(e instanceof Error ? e.message : 'Map failed to load')
      }
    })()
    return () => { cancelled = true }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  async function save() {
    const map = mapObj.current
    const marker = markerObj.current
    if (!map || !marker) return
    setSaving(true)
    setErr(null)
    try {
      const c = map.getCenter()
      const m = marker.getPosition()
      const res = await fetch(`/api/articles/${articleId}/hero-from-google`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          source: 'satellite',
          center: `${c.lat()},${c.lng()}`,
          zoom: Math.round(map.getZoom()),
          marker: `${m.lat()},${m.lng()}`,
          showPin,
        }),
      })
      const data = await res.json().catch(() => ({}))
      if (!res.ok) throw new Error(data.error || 'Save failed')
      onSaved(data.url)
    } catch (e) {
      setErr(e instanceof Error ? e.message : 'Save failed')
      setSaving(false)
    }
  }

  return (
    <div>
      <div style={{ fontFamily: 'ui-monospace, Menlo, monospace', fontSize: 11, letterSpacing: '0.14em', textTransform: 'uppercase', color: '#4F4F4B', marginBottom: 8 }}>
        Position on map — drag the pin onto the building, pan &amp; zoom to frame
      </div>
      <div
        ref={mapRef}
        style={{ width: '100%', aspectRatio: '5 / 3', border: '1px solid #0A0A0A', background: '#e9e6df' }}
      />
      {!ready && !err && (
        <div style={{ fontFamily: 'ui-monospace, Menlo, monospace', fontSize: 11, color: '#888', marginTop: 8 }}>Loading map…</div>
      )}
      <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginTop: 10, flexWrap: 'wrap' }}>
        <label style={{ display: 'flex', alignItems: 'center', gap: 6, fontFamily: 'ui-monospace, Menlo, monospace', fontSize: 11, color: '#4F4F4B', cursor: 'pointer' }}>
          <input type="checkbox" checked={showPin} onChange={e => setShowPin(e.target.checked)} disabled={saving} />
          Show pin on the photo
        </label>
        <div style={{ flex: 1 }} />
        <button onClick={onCancel} disabled={saving} style={btn}>Cancel</button>
        <button onClick={save} disabled={saving || !ready} style={{ ...btn, background: '#0A0A0A', color: '#fff', borderColor: '#0A0A0A' }}>
          {saving ? 'Saving…' : 'Use this view'}
        </button>
      </div>
      {err && <div style={{ marginTop: 8, color: '#c0392b', fontSize: 12 }}>{err}</div>}
    </div>
  )
}

const btn: React.CSSProperties = {
  padding: '7px 13px',
  fontSize: 11,
  letterSpacing: 1.4,
  textTransform: 'uppercase',
  background: '#fff',
  color: '#111',
  border: '1px solid #D6CBB3',
  borderRadius: 2,
  cursor: 'pointer',
  fontFamily: 'ui-monospace, Menlo, monospace',
}
