import { NextResponse } from 'next/server'
import { createHash } from 'crypto'
import { cookies, draftMode } from 'next/headers'
import { Client } from 'pg'
import { createClient } from '@/lib/supabase/server'

export const runtime = 'nodejs'

// Sitewide reader-analytics beacon. TrackPageView (mounted in the public
// layout) POSTs { path, source, referrer } on every public page load and on
// every client-side navigation. We record one row per view in post_views
// (anon insert-only), hashing the visitor for unique-ish counts without
// storing any PII.
//
// Four things are deliberately NOT counted, because each one would quietly
// inflate the numbers with non-visitor traffic:
//   1. bots, by user-agent
//   2. anything not served from the production host — localhost and Vercel
//      preview deploys, matching how the Google/LinkedIn tags are gated
//   3. logged-in sessions: David and Nic browsing the live public site
//   4. CMS draft previews

const BOT_RE = /bot|crawl|spider|slurp|bing|yandex|baidu|duckduck|preview|fetch|monitor|headless|lighthouse|curl|wget|python-requests|axios|node-fetch/i
const SOURCES = new Set(['email', 'direct', 'social', 'internal', 'other'])
const PROD_HOSTS = new Set(['atlasbrief.la', 'www.atlasbrief.la'])

// The internal tools don't render the public layout, so they never beacon in
// the first place. Reject them explicitly anyway — the log should only ever
// hold public pages, whatever gets built later.
const INTERNAL_RE = /^\/(analytics|listings|development|cms|admin|login|api|next)(\/|$)/

// /atlas-brief/<slug> is a single article (a brief or a freeform post).
// /atlas-brief and /atlas-brief/sections/<x> are index pages — two segments,
// so they correctly fall through to kind 'page'.
const ARTICLE_RE = /^\/atlas-brief\/([^/]+)$/

// Strip query and hash, drop any trailing slash. Without this a single page
// splits into a row per campaign URL and the counts stop meaning anything —
// the campaign is already captured in `source`.
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
  // --- 1. bots ---
  const ua = req.headers.get('user-agent') || ''
  if (BOT_RE.test(ua)) return ok('bot')

  // --- 2. production host only ---
  const host = (req.headers.get('x-forwarded-host') || req.headers.get('host') || '')
    .split(':')[0]
    .toLowerCase()
  if (!PROD_HOSTS.has(host)) return ok('non-prod')

  let path: string | null = null
  let source: string | null = null
  let referrer: string | null = null
  let rid = ''
  try {
    const body = await req.json()
    path = cleanPath(body?.path)
    const s = typeof body?.source === 'string' ? body.source.toLowerCase() : ''
    source = SOURCES.has(s) ? s : 'other'
    referrer = typeof body?.referrer === 'string' ? body.referrer.slice(0, 400) || null : null
    rid = typeof body?.rid === 'string' ? body.rid.trim().slice(0, 320) : ''
  } catch {
    return NextResponse.json({ ok: false }, { status: 400 })
  }
  if (!path) return NextResponse.json({ ok: false }, { status: 400 })
  if (INTERNAL_RE.test(path)) return ok('internal-page')

  // --- 3. CMS draft preview ---
  const { isEnabled: isDraft } = await draftMode()
  if (isDraft) return ok('draft-preview')

  // --- 4. logged-in admins ---
  // getUser() is a network round trip, so only pay for it when an auth cookie
  // is actually present. Anonymous readers (nearly all traffic) skip it.
  const cookieStore = await cookies()
  const hasAuthCookie = cookieStore.getAll().some((c) => /^sb-.*-auth-token/.test(c.name))
  const supabase = await createClient()
  if (hasAuthCookie) {
    const { data: { user } } = await supabase.auth.getUser()
    if (user) return ok('admin')
  }

  const articleMatch = ARTICLE_RE.exec(path)
  const kind = articleMatch ? 'article' : 'page'
  const slug = articleMatch ? articleMatch[1] : null

  // Daily visitor hash from ip + ua — enough to dedupe a reader within a day,
  // never reversible to the person.
  const ip = (req.headers.get('x-forwarded-for') || '').split(',')[0].trim()
  const day = new Date().toISOString().slice(0, 10)
  const visitorHash = createHash('sha256').update(`${ip}|${ua}|${day}`).digest('hex').slice(0, 32)

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
    visitor_hash: visitorHash,
    subscriber_id: reader?.id ?? null,
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
