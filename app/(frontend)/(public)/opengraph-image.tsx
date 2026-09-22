import { ImageResponse } from 'next/og'
import { readFile } from 'node:fs/promises'
import { join } from 'node:path'

// The Open Graph banner — what LinkedIn, X and iMessage show for any link that
// isn't an article. Articles override it with their own hero photo (see the
// [slug] page's generateMetadata).
//
// This is the site's flag: navy ground, the roundel, the wordmark with "Brief"
// in red italic, a hairline and the dateline. It was on the old warm-paper
// palette (#FFF4E3 cream, #8B5A2B brown, system sans) until 2026-09-22 — the
// last thing anyone saw first that hadn't moved onto the brand.
//
// Satori, which renders this, is not a browser:
//   - it has no fonts of its own beyond a system sans, so the serif faces are
//     bundled in assets/ and registered below. Without them the wordmark falls
//     back to sans and the lockup stops reading as the lockup.
//   - every element with more than one child needs an explicit `display`, and
//     there is no `<svg>` support worth relying on, so the roundel is built
//     from divs rather than reusing AtlasMark.

const NAVY = '#061832'
const RED = '#E73736'

export const alt = 'Atlas Brief — A Journal of Los Angeles Real Estate'
export const size = { width: 1200, height: 630 }
export const contentType = 'image/png'

export default async function Image() {
  // process.cwd() is the project root, per Next's opengraph-image docs — these
  // are read at generation time, not served, which is why they're in assets/
  // rather than public/.
  const [serif, serifItalic] = await Promise.all([
    readFile(join(process.cwd(), 'assets/Newsreader-SemiBold.ttf')),
    readFile(join(process.cwd(), 'assets/Newsreader-SemiBoldItalic.ttf')),
  ])

  return new ImageResponse(
    (
      <div
        style={{
          width: '100%',
          height: '100%',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          position: 'relative',
          background: NAVY,
          // The flag's 3px red rule, scaled for a card this size.
          borderBottom: `10px solid ${RED}`,
          fontFamily: 'Newsreader',
        }}
      >
        {/* The roundel. Navy disc on navy ground — the ring is what separates
            them, the same reason AtlasMark carries one in the nav. */}
        <div
          style={{
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'center',
            width: 104,
            height: 104,
            borderRadius: 104,
            background: NAVY,
            border: '4px solid rgba(255,255,255,0.45)',
          }}
        >
          <div style={{ display: 'flex', fontSize: 58, lineHeight: 1, color: '#FFFFFF' }}>A</div>
          <div style={{ display: 'flex', width: 56, height: 8, marginTop: 6, background: RED }} />
        </div>

        {/* The wordmark. Two spans rather than one string: "Brief" is a
            different colour and a different face. */}
        <div style={{ display: 'flex', alignItems: 'baseline', marginTop: 34 }}>
          <div style={{ display: 'flex', fontSize: 132, lineHeight: 1, color: '#FFFFFF' }}>
            Atlas
          </div>
          <div
            style={{
              display: 'flex',
              fontSize: 132,
              lineHeight: 1,
              marginLeft: 24,
              color: RED,
              fontStyle: 'italic',
            }}
          >
            Brief
          </div>
        </div>

        <div
          style={{
            display: 'flex',
            width: 560,
            height: 1,
            marginTop: 30,
            background: 'rgba(255,255,255,0.28)',
          }}
        />
        <div
          style={{
            display: 'flex',
            marginTop: 18,
            fontSize: 25,
            letterSpacing: 7,
            color: 'rgba(255,255,255,0.72)',
          }}
        >
          A JOURNAL OF LOS ANGELES REAL ESTATE
        </div>

        {/* Byline and domain, pinned to the foot so they don't pull the flag
            off centre. */}
        <div
          style={{
            display: 'flex',
            position: 'absolute',
            left: 80,
            right: 80,
            bottom: 46,
            justifyContent: 'space-between',
            alignItems: 'center',
            fontSize: 24,
            color: 'rgba(255,255,255,0.6)',
          }}
        >
          <div style={{ display: 'flex' }}>David Safai · Owner-builder, 30 years in LA</div>
          <div style={{ display: 'flex', letterSpacing: 2, color: 'rgba(255,255,255,0.75)' }}>
            atlasbrief.la
          </div>
        </div>
      </div>
    ),
    {
      ...size,
      fonts: [
        { name: 'Newsreader', data: serif, style: 'normal', weight: 600 },
        { name: 'Newsreader', data: serifItalic, style: 'italic', weight: 600 },
      ],
    }
  )
}
