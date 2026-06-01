// Normalize HTML pasted into article bodies from external sources (CoStar,
// Crexi, etc.). David's workflow includes right-click → Copy outerHTML on
// broker cards and photo blocks; that drags in inline Tailwind preflight
// styles and CSS-Modules-hashed class names (broker__thumbnail-contact--FFJmE,
// etc.) which clutter the DOM and ignore our site CSS.
//
// Strategy (inverse allowlist — strip only what looks external, keep the rest
// untouched so hand-written or future markup isn't accidentally nuked):
//   1. Strip every inline `style="..."` attribute (kills the Tailwind noise).
//   2. From `class="..."` values, drop any token containing `--` (CSS Modules
//      hash separator) or `__` (BEM-style block__element). Our site uses
//      simple kebab-case names (.brokers, .broker-name, .table-fig, ...), so
//      neither pattern collides with anything legit.
//   3. Drop empty `class=""` attributes left behind.
//   4. Strip `data-*` attributes (third-party framework hooks, never used by
//      our markup).
//
// We do not parse with DOMParser because this also runs in Node (server
// actions, edge functions). Regex is fine — the inputs are well-formed HTML
// fragments produced by browsers or our own AI output.

export function sanitizeBodyHtml(html: string | null | undefined): string {
  if (!html) return ''
  let out = html

  // 1. Strip inline style attributes (handles both " and ' quoting).
  out = out.replace(/\s+style\s*=\s*"[^"]*"/gi, '')
  out = out.replace(/\s+style\s*=\s*'[^']*'/gi, '')

  // 2. Filter class attributes — drop tokens containing -- or __.
  const filterClass = (cls: string): string => {
    return cls
      .split(/\s+/)
      .filter(c => c.length > 0 && !c.includes('--') && !c.includes('__'))
      .join(' ')
  }
  out = out.replace(/\s+class\s*=\s*"([^"]*)"/gi, (_, cls: string) => {
    const kept = filterClass(cls)
    return kept === '' ? '' : ` class="${kept}"`
  })
  out = out.replace(/\s+class\s*=\s*'([^']*)'/gi, (_, cls: string) => {
    const kept = filterClass(cls)
    return kept === '' ? '' : ` class='${kept}'`
  })

  // 3. Strip data-* attributes.
  out = out.replace(/\s+data-[a-z0-9_-]+\s*=\s*"[^"]*"/gi, '')
  out = out.replace(/\s+data-[a-z0-9_-]+\s*=\s*'[^']*'/gi, '')

  // 4. Collapse whitespace runs that the above passes leave inside tag attrs.
  //    Match `<tag ... >` only — never touch text content.
  out = out.replace(/<([a-z][a-z0-9-]*)([^>]*)>/gi, (_, tag: string, attrs: string) => {
    const cleaned = attrs.replace(/\s{2,}/g, ' ')
    return `<${tag}${cleaned}>`
  })

  return out
}
