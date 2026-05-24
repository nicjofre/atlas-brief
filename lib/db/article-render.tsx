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
