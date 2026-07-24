import { NextResponse } from 'next/server'
import { createHash } from 'crypto'
import { cookies, draftMode } from 'next/headers'
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
  try {
    const body = await req.json()
    path = cleanPath(body?.path)
    const s = typeof body?.source === 'string' ? body.source.toLowerCase() : ''
    source = SOURCES.has(s) ? s : 'other'
    referrer = typeof body?.referrer === 'string' ? body.referrer.slice(0, 400) || null : null
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

  const { error } = await supabase.from('post_views').insert({
    path,
    kind,
    slug,
    article_id: articleId,
    source,
    referrer,
    visitor_hash: visitorHash,
  })
  if (error) {
    console.error('[track/view] insert failed', error.message)
    return NextResponse.json({ ok: false }, { status: 500 })
  }
  return ok()
}
