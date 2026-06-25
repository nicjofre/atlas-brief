import { NextResponse } from 'next/server'
import { createHash } from 'crypto'
import { createClient } from '@/lib/supabase/server'

export const runtime = 'nodejs'

// Reader-analytics beacon. The public article page POSTs { slug, source,
// referrer } on load (via sendBeacon). We record one row per view in
// post_views (anon insert-only), filtering obvious bots and hashing the
// visitor for unique-ish counts without storing any PII.

const BOT_RE = /bot|crawl|spider|slurp|bing|yandex|baidu|duckduck|preview|fetch|monitor|headless|lighthouse|curl|wget|python-requests|axios|node-fetch/i
const SOURCES = new Set(['email', 'direct', 'social', 'other'])

export async function POST(req: Request) {
  const ua = req.headers.get('user-agent') || ''
  if (BOT_RE.test(ua)) return NextResponse.json({ ok: true, skipped: 'bot' })

  let slug = ''
  let source: string | null = null
  let referrer: string | null = null
  try {
    const body = await req.json()
    slug = typeof body?.slug === 'string' ? body.slug.slice(0, 200) : ''
    const s = typeof body?.source === 'string' ? body.source.toLowerCase() : ''
    source = SOURCES.has(s) ? s : 'other'
    referrer = typeof body?.referrer === 'string' ? body.referrer.slice(0, 400) || null : null
  } catch {
    return NextResponse.json({ ok: false }, { status: 400 })
  }
  if (!slug) return NextResponse.json({ ok: false }, { status: 400 })

  // Daily visitor hash from ip + ua — enough to dedupe a reader within a day,
  // never reversible to the person.
  const ip = (req.headers.get('x-forwarded-for') || '').split(',')[0].trim()
  const day = new Date().toISOString().slice(0, 10)
  const visitorHash = createHash('sha256').update(`${ip}|${ua}|${day}`).digest('hex').slice(0, 32)

  const supabase = await createClient()
  // Best-effort article_id (the published article is anon-readable).
  const { data: art } = await supabase.from('articles').select('id').eq('slug', slug).maybeSingle()

  const { error } = await supabase.from('post_views').insert({
    slug,
    article_id: art?.id ?? null,
    source,
    referrer,
    visitor_hash: visitorHash,
  })
  if (error) {
    console.error('[track/view] insert failed', error.message)
    return NextResponse.json({ ok: false }, { status: 500 })
  }
  return NextResponse.json({ ok: true })
}
