import { ImageResponse } from 'next/og'

// Branded Open Graph banner for the public site — what shows when a link is
// shared on LinkedIn / X / iMessage etc. Generated (no static asset to manage)
// at Atlas Brief's warm-paper palette. Articles override this with their own
// hero photo (see the [slug] page's generateMetadata).

export const alt = 'Atlas Brief — A Journal of Record on LA Real Estate'
export const size = { width: 1200, height: 630 }
export const contentType = 'image/png'

export default function Image() {
  return new ImageResponse(
    (
      <div
        style={{
          width: '100%',
          height: '100%',
          display: 'flex',
          flexDirection: 'column',
          justifyContent: 'space-between',
          background: '#FFF4E3',
          padding: '72px 80px',
          borderTop: '14px solid #8B5A2B',
        }}
      >
        <div style={{ display: 'flex', fontSize: 26, letterSpacing: 6, color: '#6E4520', textTransform: 'uppercase' }}>
          A Journal of Record
        </div>

        <div style={{ display: 'flex', flexDirection: 'column' }}>
          <div style={{ display: 'flex', fontSize: 148, fontWeight: 700, color: '#0A0A0A', lineHeight: 1 }}>
            Atlas <span style={{ color: '#8B5A2B', marginLeft: 24 }}>Brief</span>
          </div>
          <div style={{ display: 'flex', fontSize: 38, color: '#1F1F1D', marginTop: 28, maxWidth: 900 }}>
            Every significant multifamily sale, land deal, and development move in Los Angeles.
          </div>
        </div>

        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: 26, color: '#4F4F4B' }}>
          <span>Tracked and explained by David Safai, 30-year operator.</span>
          <span style={{ color: '#6E4520', letterSpacing: 2 }}>atlasbrief.la</span>
        </div>
      </div>
    ),
    { ...size }
  )
}
