import { cookies } from 'next/headers'
import { classifyTouch, sanitizeTouch, type Touch } from './channel'
import type { Json } from '@/lib/db/types'

// Server side of reader attribution. TrackPageView writes two first-party
// cookies when a reader arrives from outside the site (see lib/analytics/
// attribution-client.ts); every signup route reads them here, so no form has to
// remember to send anything and a new form gets attribution for free.
//
//   ab_ft — first touch: how this browser first reached the site
//   ab_lt — last touch:  the most recent outside arrival (direct visits don't
//           overwrite it, so "typed the URL back in" doesn't erase the post
//           that brought them)

export const FIRST_TOUCH_COOKIE = 'ab_ft'
export const LAST_TOUCH_COOKIE = 'ab_lt'

function readTouch(raw: string | undefined): Touch | null {
  if (!raw) return null
  try {
    return sanitizeTouch(JSON.parse(decodeURIComponent(raw)))
  } catch {
    return null
  }
}

export async function readTouches(): Promise<{ first: Touch | null; last: Touch | null }> {
  const jar = await cookies()
  return {
    first: readTouch(jar.get(FIRST_TOUCH_COOKIE)?.value),
    last: readTouch(jar.get(LAST_TOUCH_COOKIE)?.value),
  }
}

// Columns for a subscribers insert. Everything is null when the browser has no
// cookies (blocked, cleared, or a signup from a page the beacon never saw),
// which reads honestly as "unknown" rather than as Direct.
export async function subscriberAttribution() {
  const { first, last } = await readTouches()
  const f = first ? classifyTouch(first) : null
  const l = last ? classifyTouch(last) : null
  // Round-trip through JSON so the undefined keys drop out: that's also exactly
  // what lands in the jsonb column, and it satisfies the Json type.
  const asJson = (t: Touch | null) => (t ? (JSON.parse(JSON.stringify(t)) as Json) : null)
  return {
    first_touch: asJson(first),
    last_touch: asJson(last),
    first_channel: f?.channel ?? null,
    first_paid: f?.paid ?? null,
    last_channel: l?.channel ?? null,
    last_paid: l?.paid ?? null,
  }
}
