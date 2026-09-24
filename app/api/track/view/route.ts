import { NextResponse } from 'next/server'
import { cookies } from 'next/headers'
import { Client } from 'pg'
import { createClient } from '@/lib/supabase/server'
import { requestSkipReason, sessionSkipReason, visitorHash } from '@/lib/analytics/beacon-guard'
import { classifyTouch, sanitizeTouch } from '@/lib/analytics/channel'

export const runtime = 'nodejs'

// Sitewide reader-analytics beacon. TrackPageView (mounted in the public
// layout) POSTs { path, source, referrer } on every public page load and on
// every client-side navigation. We record one row per view in post_views
// (anon insert-only), hashing the visitor for unique-ish counts without
// storing any PII. Bots, preview deploys, CMS drafts and signed-in admins are
// dropped first — see lib/analytics/beacon-guard.ts.

const SOURCES = new Set(['email', 'direct', 'social', 'internal', 'other'])

// The internal tools don't render the public layout, so they never beacon in
// the first place. Reject them explicitly anyway — the log should only ever
// hold public pages, whatever gets built later.
const INTERNAL_RE = /^\/(analytics|listings|development|cms|admin|login|api|next)(\/|$)/

// /atlas-brief/<slug> is a single article (a brief or a freeform post).
// /atlas-brief and /atlas-brief/sections/<x> are index pages — two segments,
// so they correctly fall through to kind 'page'.
const ARTICLE_RE = /^\/atlas-brief\/([^/]+)$/

// Strip query and hash, drop any trailing slash. Without this a single page
// splits into a row per campaign URL and the counts stop meaning anything.
// The campaign isn't lost with the query string: the client reads the tags off
// the URL first and sends them separately as `arrival` (utm_* columns).
function cleanPath(v: unknown): string | null {
  if (typeof v !== 'string') return null
  let p = v.split('?')[0].split('#')[0].trim()
  if (!p.startsWith('/') || p.length > 300) return null
  if (p.length > 1) p = p.replace(/\/+$/, '') || '/'
  return p
}

// ---- dispatch reader attribution ----
//
// Most views are anonymous and stay that way. The exception is a reader who
// clicked through from a dispatch: Resend fills ?rid= with that recipient's own
// address, so we can resolve it to a subscriber and stamp the view with their
// id. From then on an httpOnly cookie carries an opaque token, so the rest of
// the visit attributes without the address ever going back over the wire.
//
// Caveat worth knowing when reading the numbers: if a subscriber forwards the
// email, the forwarded link still carries the original recipient's rid, so the
// forwardee's read lands under the original subscriber. There is no way to tell
// the two apart from a link click.
const READER_COOKIE = 'ab_reader'
const READER_COOKIE_MAX_AGE = 60 * 60 * 24 * 180 // 180 days
const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i

type Reader = { id: string; token: string }

// Subscribers are not readable by the anon role (the list stays private), so
// this runs over the direct DB connection — the same way the Resend webhook
// writes. Only opened when there's actually an identity to resolve, so ordinary
// anonymous traffic never pays for the connection.
async function resolveReader(rid: string, cookieToken: string): Promise<Reader | null> {
  const byEmail = EMAIL_RE.test(rid) ? rid.toLowerCase() : null
  const byToken = UUID_RE.test(cookieToken) ? cookieToken : null
  // An unrendered merge tag ({{{contact.email}}} arriving literally) fails the
  // email test and lands here as null, which degrades to an anonymous view.
  if (!byEmail && !byToken) return null

  const c = new Client({ connectionString: process.env.DATABASE_URI })
  try {
    await c.connect()
    // The address wins when present: it's the fresh signal from this click,
    // and it's how a second subscriber on a shared browser gets picked up.
    for (const [sql, param] of [
      byEmail ? ['select id, track_token from subscribers where email = $1', byEmail] : null,
      byToken ? ['select id, track_token from subscribers where track_token = $1', byToken] : null,
    ].filter(Boolean) as [string, string][]) {
      const { rows } = await c.query<{ id: string; track_token: string }>(sql, [param])
      if (rows[0]) return { id: rows[0].id, token: rows[0].track_token }
    }
    return null
  } catch (e) {
    // Attribution is a bonus on top of the view — never fail the beacon for it.
    console.error('[track/view] reader lookup failed', (e as Error).message)
    return null
  } finally {
    await c.end().catch(() => {})
  }
}

const ok = (skipped?: string) => NextResponse.json(skipped ? { ok: true, skipped } : { ok: true })

export async function POST(req: Request) {
  // --- bots and non-production hosts ---
  const early = requestSkipReason(req)
  if (early) return ok(early)

  let path: string | null = null
  let source: string | null = null
  let referrer: string | null = null
  let rid = ''
  let arrival: ReturnType<typeof sanitizeTouch> = null
  try {
    const body = await req.json()
    path = cleanPath(body?.path)
    const s = typeof body?.source === 'string' ? body.source.toLowerCase() : ''
    source = SOURCES.has(s) ? s : 'other'
    referrer = typeof body?.referrer === 'string' ? body.referrer.slice(0, 400) || null : null
    rid = typeof body?.rid === 'string' ? body.rid.trim().slice(0, 320) : ''
    arrival = sanitizeTouch(body?.arrival)
  } catch {
    return NextResponse.json({ ok: false }, { status: 400 })
  }
  if (!path) return NextResponse.json({ ok: false }, { status: 400 })
  if (INTERNAL_RE.test(path)) return ok('internal-page')

  // --- CMS draft previews and signed-in admins ---
  const late = await sessionSkipReason()
  if (late) return ok(late)

  const cookieStore = await cookies()
  const supabase = await createClient()

  const articleMatch = ARTICLE_RE.exec(path)
  const kind = articleMatch ? 'article' : 'page'
  const slug = articleMatch ? articleMatch[1] : null

  // Channel and paid flag for an arrival only. Internal page-to-page clicks
  // have no channel of their own; the visit's first page carries it.
  let refHost = ''
  try {
    refHost = referrer ? new URL(referrer).hostname : ''
  } catch {}
  const arrived = source !== 'internal'
  const cls = arrived ? classifyTouch({ ...arrival, ref: refHost }) : null

  // Best-effort article_id (the published article is anon-readable). Only
  // briefs live in `articles` — freeform posts are Payload rows, so a null
  // article_id here is normal and the slug still identifies the piece.
  let articleId: string | null = null
  if (slug) {
    const { data: art } = await supabase.from('articles').select('id').eq('slug', slug).maybeSingle()
    articleId = art?.id ?? null
  }

  const reader = await resolveReader(rid, cookieStore.get(READER_COOKIE)?.value || '')

  const { error } = await supabase.from('post_views').insert({
    path,
    kind,
    slug,
    article_id: articleId,
    source,
    referrer,
    visitor_hash: visitorHash(req),
    subscriber_id: reader?.id ?? null,
    channel: cls?.channel ?? null,
    paid: cls?.paid ?? null,
    utm_source: arrived ? arrival?.us ?? null : null,
    utm_medium: arrived ? arrival?.um ?? null : null,
    utm_campaign: arrived ? arrival?.uc ?? null : null,
    utm_content: arrived ? arrival?.ut ?? null : null,
    ad_click: arrived ? arrival?.ac ?? null : null,
  })
  if (error) {
    console.error('[track/view] insert failed', error.message)
    return NextResponse.json({ ok: false }, { status: 500 })
  }

  const res = ok()
  if (reader) {
    // httpOnly so page scripts can't read who the reader is, and re-set on
    // every attributed view so an active reader's window keeps rolling forward.
    res.cookies.set(READER_COOKIE, reader.token, {
      httpOnly: true,
      secure: true,
      sameSite: 'lax',
      path: '/',
      maxAge: READER_COOKIE_MAX_AGE,
    })
  }
  return res
}
