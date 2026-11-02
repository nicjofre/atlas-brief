import { render } from '@react-email/render'
import { getArticles, type ArticleCard } from '@/lib/db/articles'
import { calmHeadline } from '@/lib/db/headline-case'
import { siteBaseUrl, articleUrl } from './build-dispatch'
import { unsubscribeToken } from './unsubscribe-token'
import { WelcomeEmail, type WelcomeCard } from './welcome-template'

// The physical address CAN-SPAM requires in every commercial email. The site
// only says "Los Angeles, California", which isn't enough. TODO before merge:
// David's real mailing address (a PO box is fine).
export const MAILING_ADDRESS = '[MAILING ADDRESS NEEDED] · Los Angeles, CA'

function tapeLabel(a: ArticleCard): string {
  return a.listing?.property?.neighborhood ?? a.listing?.property?.city ?? 'The Tape'
}

// Builds the welcome email for one address: the newest Tape brief and the
// newest Owner's Notes post as two cards, with that address's own signed
// unsubscribe link (also returned for the List-Unsubscribe header).
export async function renderWelcomeHtml(email: string): Promise<{ html: string; unsubscribeUrl: string }> {
  const articles = await getArticles()
  const tape = articles.find(a => a.kind !== 'post')
  const notes = articles.find(a => a.kind === 'post')
  const cards: WelcomeCard[] = []
  if (tape) cards.push({ stream: 'tape', label: tapeLabel(tape), headline: calmHeadline(tape.headline), url: articleUrl(tape.slug) })
  if (notes) cards.push({ stream: 'notes', label: 'Owner’s Notes', headline: calmHeadline(notes.headline), url: articleUrl(notes.slug) })

  const base = siteBaseUrl()
  const unsubscribeUrl = `${base}/unsubscribe?t=${unsubscribeToken(email)}`
  const html = await render(
    <WelcomeEmail
      cards={cards}
      forwardUrl={`${base}/subscribe?source=forward`}
      unsubscribeUrl={unsubscribeUrl}
      mailingAddress={MAILING_ADDRESS}
    />,
    { pretty: false }
  )
  // Keep Resend's click tracking off the Unsubscribe link (it stays on the
  // article cards): a tracked unsubscribe adds a redirect hop and looks shady to
  // spam filters. Resend's tracking is Amazon SES's, which skips any link with
  // the `ses:no-track` attribute; React can't write a colon attribute, so it's
  // added to the rendered HTML.
  const tracked = `href="${unsubscribeUrl}"`
  if (!html.includes(tracked)) console.error('[welcome] unsubscribe link not found; it will be click-tracked')
  return { html: html.replace(tracked, `ses:no-track ${tracked}`), unsubscribeUrl }
}
