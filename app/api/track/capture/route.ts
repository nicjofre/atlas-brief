import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { requestSkipReason, sessionSkipReason, visitorHash } from '@/lib/analytics/beacon-guard'
import { readTouches } from '@/lib/analytics/attribution-server'
import { classifyTouch } from '@/lib/analytics/channel'

export const runtime = 'nodejs'

// Capture-prompt events: the signup pop-up being shown, dismissed, or submitted.
//
// Until this existed the only thing recorded was a successful signup, so there
// was no way to tell a pop-up nobody saw from one everybody closed — which made
// "are the name fields costing signups" and "is 25% the right trigger point"
// unanswerable. shown → submitted is the conversion rate; shown → dismissed,
// split by `how`, is the annoyance rate.
//
// Same audience filters as the page-view beacon, and the visit's channel comes
// from the last-touch cookie, so a pop-up can be judged per traffic source.

const EVENTS = new Set(['shown', 'dismissed', 'submitted'])
const SURFACES = new Set(['popup'])
const TRIGGERS = new Set(['scroll', 'nav'])
const HOWS = new Set(['close', 'skip', 'backdrop', 'escape'])

const pick = (v: unknown, allowed: Set<string>) =>
  typeof v === 'string' && allowed.has(v) ? v : null

const ok = (skipped?: string) => NextResponse.json(skipped ? { ok: true, skipped } : { ok: true })

export async function POST(req: Request) {
  const early = requestSkipReason(req)
  if (early) return ok(early)

  let body: Record<string, unknown>
  try {
    body = await req.json()
  } catch {
    return NextResponse.json({ ok: false }, { status: 400 })
  }
  const event = pick(body.event, EVENTS)
  const surface = pick(body.surface, SURFACES)
  if (!event || !surface) return NextResponse.json({ ok: false }, { status: 400 })

  const late = await sessionSkipReason()
  if (late) return ok(late)

  const { last } = await readTouches()
  const cls = last ? classifyTouch(last) : null
  const text = (v: unknown, max: number) =>
    typeof v === 'string' && v.trim() ? v.trim().slice(0, max) : null

  const supabase = await createClient()
  const { error } = await supabase.from('capture_events').insert({
    event,
    surface,
    trigger: pick(body.trigger, TRIGGERS),
    how: event === 'dismissed' ? pick(body.how, HOWS) : null,
    path: text(body.path, 300),
    slug: text(body.slug, 200),
    visitor_hash: visitorHash(req),
    channel: cls?.channel ?? null,
    paid: cls?.paid ?? null,
  })
  if (error) {
    console.error('[track/capture] insert failed', error.message)
    return NextResponse.json({ ok: false }, { status: 500 })
  }
  return ok()
}
