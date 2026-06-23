import { Fragment } from 'react'

// David's headlines follow a convention: one italic phrase, wrapped in *...*.
// E.g. "5712 Camellia, NoHo: 14 Doors at *$306K a Unit.*"
// We split on the asterisks and wrap the inner part in <em>. If there are no
// asterisks, the whole string renders plain. Anything weirder than one *...*
// pair falls back to plain text — we keep this intentionally dumb rather
// than pulling in a markdown parser for a one-line input.
export function HeadlineText({ text }: { text: string | null | undefined }) {
  if (!text) return null
  const parts = text.split(/\*([^*]+)\*/)
  if (parts.length === 1) return <>{text}</>
  return (
    <>
      {parts.map((part, i) =>
        i % 2 === 0 ? <Fragment key={i}>{part}</Fragment> : <em key={i}>{part}</em>
      )}
    </>
  )
}

// Build the in-page TOC from the body HTML by scanning for <h2 id="...">...</h2>.
// David's posts all use id'd H2s for each section; we use them as anchors.
export function extractTOCFromHtml(html: string | null | undefined): { id: string; text: string }[] {
  if (!html) return []
  const out: { id: string; text: string }[] = []
  const re = /<h2[^>]*\bid="([^"]+)"[^>]*>([\s\S]*?)<\/h2>/g
  let m: RegExpExecArray | null
  while ((m = re.exec(html)) !== null) {
    // strip nested tags from the H2 text
    const text = m[2].replace(/<[^>]+>/g, '').trim()
    out.push({ id: m[1], text })
  }
  return out
}

// Broker info used to be baked into body_html at draft time (a frozen snapshot).
// It's now rendered live from the listing's broker record, so we strip any
// legacy broker content out of stored bodies before rendering to avoid showing
// it twice. Old articles carry it in two forms:
//   1. <div class="brokers">…</div>  (depth-aware — CoStar cards nest heavily)
//   2. an <h2>Listing Broker</h2> / "Buyer Broker" / "Buyer and Listing Broker"
//      section followed by raw CoStar contact HTML, running to the next <h2>.
export function stripBrokersBlock(html: string | null | undefined): string {
  if (!html) return ''
  let out = stripBrokersDiv(html)
  out = stripBrokerH2Sections(out)
  return out
}

function stripBrokersDiv(html: string): string {
  let out = html
  const openRe = /<div\b[^>]*\bclass="brokers(?:\s[^"]*)?"[^>]*>/i
  let m: RegExpExecArray | null
  while ((m = openRe.exec(out)) !== null) {
    const start = m.index
    let depth = 1
    const tagRe = /<\/?div\b[^>]*>/gi
    tagRe.lastIndex = start + m[0].length
    let end = tagRe.lastIndex
    let t: RegExpExecArray | null
    while (depth > 0 && (t = tagRe.exec(out)) !== null) {
      depth += t[0].startsWith('</') ? -1 : 1
      end = tagRe.lastIndex
    }
    if (depth !== 0) break // unbalanced — leave the rest alone rather than mangle
    out = out.slice(0, start) + out.slice(end)
  }
  return out
}

// A broker-section heading: "Listing Broker(s)", "Buyer Broker(s)", "Buyer and
// Listing Broker(s)", "Sales Broker(s)", "Co-Listing Broker(s)", or "Broker(s)".
// Anchored so a prose <h2> that merely mentions "broker" is never matched.
const BROKER_HEADING =
  /^(?:(?:buyer\s+and\s+listing|listing|buyer|sales?|co-?listing)\s+)?brokers?$/i

function stripBrokerH2Sections(html: string): string {
  let out = html
  // Loop because each removal shifts indices.
  for (let guard = 0; guard < 8; guard++) {
    const h2Re = /<h2\b[^>]*>([\s\S]*?)<\/h2>/gi
    let m: RegExpExecArray | null
    let removeStart = -1
    let headingEnd = -1
    while ((m = h2Re.exec(out)) !== null) {
      const text = m[1].replace(/<[^>]+>/g, '').replace(/&nbsp;/g, ' ').trim()
      if (BROKER_HEADING.test(text)) {
        removeStart = m.index
        headingEnd = m.index + m[0].length
        break
      }
    }
    if (removeStart < 0) break
    const nextH2 = out.slice(headingEnd).search(/<h2\b/i)
    const removeEnd = nextH2 < 0 ? out.length : headingEnd + nextH2
    out = out.slice(0, removeStart) + out.slice(removeEnd)
  }
  return out
}

// ===================================================================
// Card-render helpers — shared between feed, section, and homepage
// ===================================================================

export function statusBadgeKey(status: string | null | undefined): 'sold' | 'forsale' {
  return status === 'sold' ? 'sold' : 'forsale'
}

export function statusKicker(status: string | null | undefined): string {
  if (status === 'sold') return 'Sold'
  if (status === 'for_sale') return 'For Sale'
  if (status === 'under_construction') return 'Under Construction'
  return 'Off Market'
}

// "Broker Activity · For sale" — used by the homepage tape-feed foot line
export function sectionStatusFoot(catLabel: string | null, status: string | null | undefined): string {
  const label = catLabel ?? 'Broker Activity'
  const verb = status === 'sold' ? 'Trade' : status === 'for_sale' ? 'For sale' : 'Listing'
  return `${label} · ${verb}`
}

// "5712 Camellia Ave · North Hollywood · 14 units, 1989"
export function placeLine(p: {
  street_address: string | null
  city: string | null
  neighborhood: string | null
  unit_count: number | null
  year_built: number | null
} | null | undefined): string {
  if (!p) return ''
  const place = p.neighborhood ?? p.city ?? ''
  const units = p.unit_count ? `${p.unit_count} units` : ''
  const yr = p.year_built ? `${p.year_built}` : ''
  const tail = [units, yr].filter(Boolean).join(', ')
  return [p.street_address, place, tail].filter(Boolean).join(' · ')
}

// "14 units · 1989 · NoHo" — compact meta for feed cards
export function cardMeta(p: {
  unit_count: number | null
  year_built: number | null
  neighborhood: string | null
  city: string | null
} | null | undefined): string {
  if (!p) return ''
  const parts: string[] = []
  if (p.unit_count) parts.push(`${p.unit_count} units`)
  if (p.year_built) parts.push(String(p.year_built))
  if (p.neighborhood) parts.push(p.neighborhood)
  else if (p.city) parts.push(p.city)
  return parts.join(' · ')
}

export function formatDateLong(s: string | null | undefined): string {
  if (!s) return ''
  const d = new Date(s)
  if (isNaN(d.getTime())) return s
  return d.toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' })
}

// Section slug → display label (kept here so feed/section/post pages stay in sync)
const SECTION_LABELS: Record<string, string> = {
  'broker-activity': 'Broker Activity',
}

export function sectionLabel(slug: string): string {
  return SECTION_LABELS[slug] ?? slug
}
