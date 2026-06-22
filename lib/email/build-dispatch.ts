import type { ArticleWithJoins } from '@/lib/db/articles'
import type { DispatchEmailProps, DispatchStat } from './dispatch-template'

// Maps a published article into the dispatch email's props. The email is a
// teaser, so we lift only the top-of-article fields: kicker, headline, deck,
// hero, the first few deal stats, and a broker tag. Heavy body content stays on
// the site (that's what the CTA is for).

// Resend replaces this token with its hosted unsubscribe URL per-recipient.
// Using the token (vs a real link) is what lets one rendered HTML serve the
// whole audience while each recipient still gets a working unsubscribe.
export const RESEND_UNSUBSCRIBE_TOKEN = '{{{RESEND_UNSUBSCRIBE_URL}}}'

export function siteBaseUrl(): string {
  return (process.env.NEXT_PUBLIC_SITE_URL || 'https://atlas-brief.vercel.app').replace(
    /\/$/,
    ''
  )
}

export function articleUrl(slug: string): string {
  return `${siteBaseUrl()}/atlas-brief/${slug}`
}

// deal_stats_html is authored as repeated
//   <div class="stat"><div class="k">..</div><div class="v">..</div><div class="s">..</div></div>
// We parse it back into structured stats and cap to the first few so the email
// stat bar stays a single readable row.
export function parseDealStats(html: string | null | undefined, limit = 4): DispatchStat[] {
  if (!html) return []
  const out: DispatchStat[] = []
  const blocks = html.match(/<div class="stat">[\s\S]*?<\/div>\s*<\/div>/g) || []
  const pick = (block: string, cls: string) => {
    const m = block.match(new RegExp(`<div class="${cls}">([\\s\\S]*?)<\\/div>`))
    return m ? m[1].replace(/<[^>]+>/g, '').trim() : ''
  }
  for (const block of blocks) {
    const k = pick(block, 'k')
    const v = pick(block, 'v')
    if (!k && !v) continue
    out.push({ k, v, s: pick(block, 's') || null })
    if (out.length >= limit) break
  }
  return out
}

function formatDateline(iso: string | null): string {
  if (!iso) return ''
  // Stable, locale-independent formatting (no Date.now / new Date() ambiguity):
  // parse the ISO date and assemble "Weekday, Month D, YYYY".
  const d = new Date(iso)
  if (Number.isNaN(d.getTime())) return ''
  const weekdays = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday']
  const months = [
    'January', 'February', 'March', 'April', 'May', 'June',
    'July', 'August', 'September', 'October', 'November', 'December',
  ]
  return `${weekdays[d.getUTCDay()]}, ${months[d.getUTCMonth()]} ${d.getUTCDate()}, ${d.getUTCFullYear()}`
}

function brokerTag(article: ArticleWithJoins): string | null {
  const lb = article.listing?.listing_broker
  if (!lb?.name) return null
  const firm = lb.firm ? ` · ${lb.firm}` : ''
  const verb = article.listing?.status === 'sold' ? 'Listed by' : 'Listed by'
  return `${verb} ${lb.name}${firm}`
}

export function buildDispatchProps(
  article: ArticleWithJoins,
  opts: { heroUrl: string | null }
): DispatchEmailProps {
  const kickerParts = [article.cat_label || 'Brief']
  if (article.status_tag) kickerParts.push(article.status_tag)

  return {
    kicker: kickerParts.join(' · '),
    dateline: formatDateline(article.published_at),
    headline: article.headline || '',
    deck: article.deck,
    heroUrl: opts.heroUrl,
    stats: parseDealStats(article.deal_stats_html),
    brokerTag: brokerTag(article),
    articleUrl: articleUrl(article.slug),
    unsubscribeUrl: RESEND_UNSUBSCRIBE_TOKEN,
  }
}
