// Google Ads conversion tracking + GA4 events. We fire these on the client the
// moment a form submission succeeds (our signups are inline forms with no
// separate confirmation page, so "fire on success" is the equivalent of David's
// "fire on the confirmation page").
//
// gtag only loads on the production host (see GoogleTag.tsx), so these are safe
// no-ops on localhost / preview deploys.
//
// Ads vs GA4 — they answer different questions and will NOT agree:
//   * Google Ads counts a conversion only when it can attribute the signup to
//     an ad click. Someone who arrives from a viral post, a newsletter link, or
//     a search and then subscribes fires this tag, but Ads reports nothing,
//     because there was no ad interaction to credit.
//   * GA4 records the event regardless of where the reader came from.
// So GA4 (plus the `subscribers` table) is the number to trust for "how fast is
// the list growing"; Ads answers only "how many signups did the ads buy".

declare global {
  interface Window {
    gtag?: (...args: unknown[]) => void
    dataLayer?: unknown[]
  }
}

export const GOOGLE_ADS_ID = 'AW-18292132689'
export const GA4_ID = 'G-K7RPZMTWNB'

// send_to values from the Google Ads conversion actions David created.
export const CONVERSIONS = {
  newsletterSignup: 'AW-18292132689/MFHDCM7ekM0cENGWr5JE',
  taxWaitlist: 'AW-18292132689/r7gNCIuiq80cENGWr5JE',
  // Survival Guide download. Reuses the newsletter-signup action until David
  // creates a dedicated "White paper download" conversion in Google Ads —
  // swap in that label here when he sends it.
  whitePaper: 'AW-18292132689/MFHDCM7ekM0cENGWr5JE',
} as const

// Resolve gtag, standing up the same queueing shim GoogleTag.tsx installs if the
// tag script hasn't finished loading yet. gtag.js drains window.dataLayer when it
// arrives, so an event fired a moment too early is queued rather than dropped.
// Returns null when there's no tag on this host at all (localhost/preview),
// which keeps those environments out of Ads and Analytics.
function resolveGtag(): ((...args: unknown[]) => void) | null {
  if (typeof window === 'undefined') return null
  if (typeof window.gtag === 'function') return window.gtag
  // dataLayer only exists once GoogleTag has rendered, i.e. on a production
  // host. Its absence means the tag was deliberately not installed.
  if (!Array.isArray(window.dataLayer)) return null
  const shim = function (...args: unknown[]) {
    // gtag.js expects the raw `arguments` object, not an array.
    // eslint-disable-next-line prefer-rest-params
    window.dataLayer!.push(arguments)
  }
  window.gtag = shim
  return shim
}

export function trackConversion(sendTo: string): void {
  const gtag = resolveGtag()
  if (!gtag) return
  gtag('event', 'conversion', {
    send_to: sendTo,
    value: 1.0,
    currency: 'USD',
  })
}

// Every path that adds a row to `subscribers` goes through here: the Ads
// conversion so campaign reporting works, plus a GA4 `sign_up` carrying the
// capture surface so we can see which one is actually producing subscribers.
// `source` matches the value written to subscribers.source, so GA4 and the
// database can be reconciled directly.
//
// `sendTo` exists for the lead-magnet forms (Survival Guide, RSO briefing).
// They subscribe the reader like any other form, but keep their own Ads action
// pointer so David can split them out without losing the GA4 event.
export function trackNewsletterSignup(
  source: string,
  sendTo: string = CONVERSIONS.newsletterSignup
): void {
  trackConversion(sendTo)
  const gtag = resolveGtag()
  if (!gtag) return
  gtag('event', 'sign_up', {
    send_to: GA4_ID,
    method: source,
  })
}
