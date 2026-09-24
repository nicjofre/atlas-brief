import { AD_CLICK_PARAMS, type Touch } from './channel'

// Client side of reader attribution: read the campaign tags and ad click ids off
// the landing URL and keep them where the signup routes can see them.
//
// Before this, the tracker kept only a five-way bucket (email/direct/social/
// internal/other) and threw the URL's query string away, so a paid Instagram
// click and a David post were the same row, and a subscriber had no record of
// where they came from at all.
//
// Stored as first-party cookies rather than localStorage because the server has
// to read them: every signup route picks them up from the request (see
// attribution-server.ts), so no form has to pass them along. Only the NAME of
// the click id is kept (gclid, fbclid), never its value — whether the click was
// bought is the question; the id itself is the ad platform's business.

const FIRST = 'ab_ft'
const LAST = 'ab_lt'
const MAX_AGE = 60 * 60 * 24 * 90 // 90 days

function getCookie(name: string): string | null {
  const hit = document.cookie.split('; ').find(c => c.startsWith(name + '='))
  return hit ? hit.slice(name.length + 1) : null
}

function setCookie(name: string, touch: Touch): void {
  const secure = location.protocol === 'https:' ? '; Secure' : ''
  document.cookie = `${name}=${encodeURIComponent(JSON.stringify(touch))}; Max-Age=${MAX_AGE}; Path=/; SameSite=Lax${secure}`
}

// Read the arrival off the URL and referrer. Call on the first page of a visit.
export function readArrival(): Touch {
  const params = new URLSearchParams(location.search)
  const get = (k: string) => params.get(k)?.trim().slice(0, 150) || undefined
  let ref: string | undefined
  try {
    ref = document.referrer ? new URL(document.referrer).hostname : undefined
  } catch {}
  return {
    ref,
    // `ref=dispatch` is what the Friday email links carry.
    us: get('utm_source') || get('ref'),
    um: get('utm_medium'),
    uc: get('utm_campaign'),
    ut: get('utm_content'),
    ac: AD_CLICK_PARAMS.find(k => params.has(k)),
    lp: location.pathname.slice(0, 300),
    t: Date.now(),
  }
}

// Remember an outside arrival. First touch is written once and kept; last touch
// is replaced by every new outside arrival except a bare direct visit, which
// would otherwise wipe out the post or ad that actually brought them.
export function rememberArrival(touch: Touch): void {
  try {
    if (!getCookie(FIRST)) setCookie(FIRST, touch)
    const isBareDirect = !touch.ref && !touch.us && !touch.um && !touch.ac
    if (!isBareDirect || !getCookie(LAST)) setCookie(LAST, touch)
  } catch {
    // cookies blocked — attribution just stays unknown
  }
}
