// The Atlas Brief roundel — "Option 1" from the identity sheet: navy disc, white
// serif A, red bar beneath it. Reused anywhere the brand needs a standalone icon
// (nav, favicon, avatars, OG cards).
//
// Drawn as SVG rather than an image so it stays crisp at any size. Fills and the
// letterform's font live in atlas-v2.css (.atlas-mark) so the mark reads from the
// brand tokens — var() in an SVG presentation attribute doesn't resolve in Safari.
//
// The ring is what separates the navy disc from the navy nav band and footer; on
// a light ground it's invisible, so the same mark works on either. The radius is
// pulled in to 30.5 so the 2.8-wide stroke (centred on the path) still clears the
// 64-unit viewBox instead of being clipped flat on the edges.
export default function AtlasMark({ size = 34 }: { size?: number }) {
  return (
    <svg
      className="atlas-mark"
      width={size}
      height={size}
      viewBox="0 0 64 64"
      role="img"
      aria-label="Atlas Brief"
    >
      <circle className="atlas-mark-disc" cx="32" cy="32" r="30.5" />
      <text className="atlas-mark-a" x="32" y="40.5" textAnchor="middle">A</text>
      <rect className="atlas-mark-bar" x="13" y="44.5" width="38" height="5.5" />
    </svg>
  )
}
