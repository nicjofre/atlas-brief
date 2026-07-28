import type { ArticleWithJoins } from '@/lib/db/articles'
import type { Post } from '@/payload-types'
import type { RoundupDeal } from './roundup-template'
import { articleUrl, RESEND_UNSUBSCRIBE_TOKEN } from './build-dispatch'

// Resend swaps these per-recipient at broadcast send time. The greeting falls
// back to "there" for any contact missing a first name.
export const RESEND_FIRST_NAME = '{{{FIRST_NAME|there}}}'
export { RESEND_UNSUBSCRIBE_TOKEN }

// The recipient's own address, filled per-recipient by Resend. Broadcasts pass
// this as the reader token so a click can be tied to the subscriber who got the
// email; preview and test renders pass nothing and get a plain link.
export const RESEND_CONTACT_EMAIL = '{{{contact.email}}}'

// ?ref=dispatch attributes the read to email in general; &rid=<recipient>
// attributes it to one named subscriber. The landing page strips rid from the
// URL immediately and never stores the address on the view row — it resolves to
// a subscriber id and a cookie. See app/api/track/view/route.ts.
function dispatchArticleUrl(slug: string, readerToken: string): string {
  const rid = readerToken ? `&rid=${readerToken}` : ''
  return `${articleUrl(slug)}?ref=dispatch${rid}`
}

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
  opts: { heroUrl: string | null; readerToken?: string }
): RoundupDeal {
  return {
    kicker: kicker(article),
    headline: article.headline || '',
    deck: article.deck,
    heroUrl: opts.heroUrl,
    brokerTag: brokerTag(article),
    articleUrl: dispatchArticleUrl(article.slug, opts.readerToken || ''),
  }
}

// A freeform post as a roundup deal. No listing, so no broker tag; the kicker
// is the post's category and the teaser is its deck.
export function buildRoundupDealFromPost(
  post: Post,
  opts: { heroUrl: string | null; readerToken?: string }
): RoundupDeal {
  return {
    kicker: post.kicker || 'Dispatch',
    headline: post.title || '',
    deck: post.deck ?? null,
    heroUrl: opts.heroUrl,
    brokerTag: null,
    articleUrl: dispatchArticleUrl(post.slug, opts.readerToken || ''),
  }
}

// Broadcasts keep the live tokens (Resend fills them per-recipient). Preview and
// test sends have no recipient context, so swap the tokens for samples so the
// render looks real.
export function sampleTokens(html: string, opts: { firstName?: string; email?: string } = {}): string {
  return html
    .replaceAll(RESEND_FIRST_NAME, opts.firstName?.trim() || 'there')
    .replaceAll(RESEND_CONTACT_EMAIL, opts.email?.trim() || 'reader@example.com')
    .replaceAll(RESEND_UNSUBSCRIBE_TOKEN, '#')
}
