import type { ArticleWithJoins } from '@/lib/db/articles'
import type { RoundupDeal } from './roundup-template'
import { articleUrl, RESEND_UNSUBSCRIBE_TOKEN } from './build-dispatch'

// Resend swaps these per-recipient at broadcast send time. The greeting falls
// back to "there" for any contact missing a first name.
export const RESEND_FIRST_NAME = '{{{FIRST_NAME|there}}}'
export { RESEND_UNSUBSCRIBE_TOKEN }

const WEEKDAYS = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday']
const MONTHS = [
  'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December',
]

// "Friday, June 27, 2026" — the dispatch's own send date, not an article's.
export function formatDispatchDate(d: Date): string {
  if (Number.isNaN(d.getTime())) return ''
  return `${WEEKDAYS[d.getDay()]}, ${MONTHS[d.getMonth()]} ${d.getDate()}, ${d.getFullYear()}`
}

function kicker(article: ArticleWithJoins): string {
  const parts = [article.cat_label || 'Brief']
  if (article.status_tag) parts.push(article.status_tag)
  return parts.join(' · ')
}

function brokerTag(article: ArticleWithJoins): string | null {
  const lb = article.listing?.listing_broker
  if (!lb?.name) return null
  const firm = lb.firm ? ` · ${lb.firm}` : ''
  return `Listed by ${lb.name}${firm}`
}

export function buildRoundupDeal(
  article: ArticleWithJoins,
  opts: { heroUrl: string | null }
): RoundupDeal {
  return {
    kicker: kicker(article),
    headline: article.headline || '',
    deck: article.deck,
    heroUrl: opts.heroUrl,
    brokerTag: brokerTag(article),
    // ?ref=dispatch lets the reader-analytics beacon attribute the read to email.
    articleUrl: `${articleUrl(article.slug)}?ref=dispatch`,
  }
}

// Broadcasts keep the live tokens (Resend fills them per-recipient). Preview and
// test sends have no recipient context, so swap the tokens for samples so the
// render looks real.
export function sampleTokens(html: string, opts: { firstName?: string } = {}): string {
  return html
    .replaceAll(RESEND_FIRST_NAME, opts.firstName?.trim() || 'there')
    .replaceAll(RESEND_UNSUBSCRIBE_TOKEN, '#')
}
