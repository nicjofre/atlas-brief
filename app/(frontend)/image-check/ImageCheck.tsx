'use client'

import { useState } from 'react'

export type Prop = { address: string; lat: number | null; lng: number | null }

const KEY = process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY

// Build the two Google image URLs. Prefer lat/lng (precise); fall back to the
// address string. Images load straight from Google (not stored), which is the
// compliant way to use them.
function streetView(p: { address: string; lat?: number | null; lng?: number | null }, size = '600x360') {
  const loc = p.lat != null && p.lng != null ? `${p.lat},${p.lng}` : encodeURIComponent(p.address)
  return `https://maps.googleapis.com/maps/api/streetview?size=${size}&location=${loc}&fov=80&key=${KEY}`
}
function satellite(p: { address: string; lat?: number | null; lng?: number | null }, size = '600x360') {
  const c = p.lat != null && p.lng != null ? `${p.lat},${p.lng}` : encodeURIComponent(p.address)
  return `https://maps.googleapis.com/maps/api/staticmap?center=${c}&zoom=18&size=${size}&maptype=satellite&key=${KEY}`
}

export default function ImageCheck({ props, hasKey }: { props: Prop[]; hasKey: boolean }) {
  const [addr, setAddr] = useState('')
  const [query, setQuery] = useState<{ address: string } | null>(null)

  return (
    <div style={{ maxWidth: 1000, margin: '0 auto', padding: '32px 24px', fontFamily: 'Georgia, serif' }}>
      <h1 style={{ fontSize: 26, margin: 0 }}>Image check</h1>
      <p style={{ color: '#666', fontSize: 14, marginTop: 4 }}>
        What Google Street View + Satellite return for a property. Images load live from Google (licensed display, attribution shown).
      </p>

      {!hasKey && (
        <div style={{ background: '#FBF6EC', border: '1px solid #EADFC8', borderRadius: 8, padding: 14, margin: '16px 0', fontSize: 14, color: '#7a5a1a' }}>
          <b>No API key yet.</b> Add <code>NEXT_PUBLIC_GOOGLE_MAPS_API_KEY</code> to the env (enable “Street View Static API” + “Maps Static API” in
          Google Cloud, create a key, restrict it by HTTP referrer to your domains). Then the images below will load.
        </div>
      )}

      <div style={{ display: 'flex', gap: 8, margin: '20px 0' }}>
        <input value={addr} onChange={(e) => setAddr(e.target.value)} placeholder="Type any address to check…"
          onKeyDown={(e) => e.key === 'Enter' && addr.trim() && setQuery({ address: addr.trim() })}
          style={{ flex: 1, padding: '11px 13px', border: '1px solid #ddd', borderRadius: 6, fontSize: 15 }} />
        <button onClick={() => addr.trim() && setQuery({ address: addr.trim() })}
          style={{ border: '1px solid #9A6B3F', background: '#9A6B3F', color: '#fff', borderRadius: 6, padding: '0 18px', fontSize: 13, letterSpacing: 1, textTransform: 'uppercase', cursor: 'pointer' }}>Check</button>
      </div>

      {query && (
        <div style={{ marginBottom: 32 }}>
          <div style={{ fontSize: 14, color: '#333', marginBottom: 8 }}>{query.address}</div>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
            <Shot label="Street View" url={hasKey ? streetView(query, '800x480') : null} />
            <Shot label="Satellite" url={hasKey ? satellite(query, '800x480') : null} />
          </div>
        </div>
      )}

      <h2 style={{ fontSize: 18, marginTop: 8 }}>Recent listings</h2>
      <p style={{ color: '#888', fontSize: 13, marginTop: -4 }}>Street View coverage across real properties (some will be missing — that&rsquo;s the coverage gap).</p>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(240px, 1fr))', gap: 14, marginTop: 12 }}>
        {props.map((p, i) => (
          <div key={i} style={{ border: '1px solid #eee', borderRadius: 8, overflow: 'hidden' }}>
            <Shot label="" url={hasKey ? streetView(p) : null} compact />
            <div style={{ padding: '8px 10px', fontSize: 12.5, color: '#333' }}>{p.address}</div>
          </div>
        ))}
      </div>
    </div>
  )
}

function Shot({ label, url, compact }: { label: string; url: string | null; compact?: boolean }) {
  return (
    <div>
      {label && <div style={{ fontSize: 11, letterSpacing: 1, textTransform: 'uppercase', color: '#999', marginBottom: 6 }}>{label}</div>}
      <div style={{ background: '#f3f2ee', aspectRatio: compact ? '5 / 3' : '5 / 3', display: 'flex', alignItems: 'center', justifyContent: 'center', overflow: 'hidden', borderRadius: compact ? 0 : 6 }}>
        {url ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={url} alt={label} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
        ) : (
          <span style={{ color: '#bbb', fontSize: 13 }}>needs API key</span>
        )}
      </div>
    </div>
  )
}
