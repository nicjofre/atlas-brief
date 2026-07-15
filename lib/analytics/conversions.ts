// Google Ads conversion tracking. We fire these on the client the moment a form
// submission succeeds (our signups are inline forms with no separate
// confirmation page, so "fire on success" is the equivalent of David's
// "fire on the confirmation page").
//
// gtag only loads on the production host (see GoogleTag.tsx), so trackConversion
// is a safe no-op on localhost / preview deploys.

declare global {
  interface Window {
    gtag?: (...args: unknown[]) => void
  }
}

// send_to values from the Google Ads conversion actions David created.
export const CONVERSIONS = {
  newsletterSignup: 'AW-18292132689/MFHDCM7ekM0cENGWr5JE',
  taxWaitlist: 'AW-18292132689/r7gNCIuiq80cENGWr5JE',
  // Survival Guide download. Reuses the newsletter-signup action until David
  // creates a dedicated "White paper download" conversion in Google Ads —
  // swap in that label here when he sends it.
  whitePaper: 'AW-18292132689/MFHDCM7ekM0cENGWr5JE',
} as const

export function trackConversion(sendTo: string): void {
  if (typeof window === 'undefined' || typeof window.gtag !== 'function') return
  window.gtag('event', 'conversion', {
    send_to: sendTo,
    value: 1.0,
    currency: 'USD',
  })
}
