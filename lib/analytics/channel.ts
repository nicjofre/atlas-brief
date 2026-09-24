// One definition of "where did this reader come from", shared by the page-view
// beacon, the signup routes and the capture-event beacon, so a channel means the
// same thing on every table.
//
// Two separate questions, answered separately:
//   channel — the platform (LinkedIn, Instagram, Search, ...)
//   paid    — whether the click was bought
// An Instagram ad and an Instagram post land from the same referrer, so the
// referrer alone can't tell them apart. The ad platforms can: Google stamps its
// clicks with gclid (or gbraid/wbraid on iOS), Meta with fbclid, LinkedIn with
// li_fat_id, Microsoft with msclkid. Those, or a paid utm_medium, mark it paid.
//
// fbclid is not proof of an ad on its own — Meta also appends it to ordinary
// outbound links from posts. It's still the best signal available without
// campaign-tagged URLs, and the ads David runs should carry utm_medium=paid_social
// anyway, which settles it.

export type Touch = {
  ref?: string // referrer host
  us?: string // utm_source
  um?: string // utm_medium
  uc?: string // utm_campaign
  ut?: string // utm_content
  ac?: string // which ad click id was present: gclid | fbclid | ...
  lp?: string // landing path
  t?: number // when (ms since epoch)
}

export const AD_CLICK_PARAMS = ['gclid', 'gbraid', 'wbraid', 'fbclid', 'li_fat_id', 'msclkid', 'ttclid'] as const

const PAID_MEDIUM_RE = /^(cpc|ppc|paid|paid[_-]?social|paidsocial|display|cpm|ads?|banner|retargeting)$/i

// Google's display network serves ads from its own frames, and the rest are the
// made-for-ads sites those ads ran on in Sep 2026 — the traffic that produced
// signups nobody read.
const GOOGLE_DISPLAY_RE = /(doubleclick\.net|googlesyndication\.com|jobguide|jobber\.|gobio\.com|whatisgreenliving|trilhaforte|baseontechs|dailygists|viralsearch|clamlandia|lucrativa|jcscreens)/i

function bySource(s: string): string | null {
  if (/^(dispatch|email|newsletter|resend)$/.test(s)) return 'Email'
  if (/linkedin|^li$/.test(s)) return 'LinkedIn'
  if (/instagram|^ig$/.test(s)) return 'Instagram'
  if (/facebook|^fb$/.test(s)) return 'Facebook'
  if (/^meta$/.test(s)) return 'Meta'
  if (/google|bing|duckduckgo/.test(s)) return 'Search'
  if (/^(x|twitter)$/.test(s)) return 'X'
  if (/tiktok/.test(s)) return 'TikTok'
  return null
}

function byReferrer(host: string): string | null {
  if (GOOGLE_DISPLAY_RE.test(host)) return 'Google display'
  if (/linkedin\.|lnkd\.in/.test(host)) return 'LinkedIn'
  if (/instagram\./.test(host)) return 'Instagram'
  if (/facebook\.|^fb\.me$/.test(host)) return 'Facebook'
  if (/(^|\.)google\.|bing\.com$|duckduckgo\.com$|search\.yahoo\./.test(host)) return 'Search'
  if (/^t\.co$|(^|\.)x\.com$|twitter\.com$/.test(host)) return 'X'
  if (/tiktok\./.test(host)) return 'TikTok'
  return null
}

export function classifyTouch(t: Touch): { channel: string; paid: boolean } {
  const us = (t.us || '').toLowerCase()
  const um = (t.um || '').toLowerCase()
  const host = (t.ref || '').toLowerCase()

  const paid = Boolean(t.ac) || PAID_MEDIUM_RE.test(um) || GOOGLE_DISPLAY_RE.test(host)

  if (um === 'email') return { channel: 'Email', paid: false }

  // An explicit utm_source is somebody telling us; trust it over the referrer.
  const channel =
    (us && bySource(us)) ||
    (host && byReferrer(host)) ||
    // A click id with no referrer: the app stripped it, but the id says who.
    (t.ac === 'fbclid' ? 'Meta' : null) ||
    (t.ac && /^(gclid|gbraid|wbraid)$/.test(t.ac) ? 'Search' : null) ||
    (t.ac === 'li_fat_id' ? 'LinkedIn' : null) ||
    (host || us ? 'Other' : 'Direct')

  return { channel, paid }
}

const clip = (v: unknown, max: number) =>
  typeof v === 'string' && v.trim() ? v.trim().slice(0, max) : undefined

// Touches arrive from a cookie the browser controls, so treat them as untrusted:
// keep only known keys, clip every string, drop anything malformed.
export function sanitizeTouch(v: unknown): Touch | null {
  if (!v || typeof v !== 'object') return null
  const o = v as Record<string, unknown>
  const ac = clip(o.ac, 20)
  const touch: Touch = {
    ref: clip(o.ref, 200),
    us: clip(o.us, 100),
    um: clip(o.um, 100),
    uc: clip(o.uc, 150),
    ut: clip(o.ut, 150),
    ac: ac && (AD_CLICK_PARAMS as readonly string[]).includes(ac) ? ac : undefined,
    lp: clip(o.lp, 300),
    t: typeof o.t === 'number' && Number.isFinite(o.t) ? o.t : undefined,
  }
  return Object.values(touch).some(x => x !== undefined) ? touch : null
}
