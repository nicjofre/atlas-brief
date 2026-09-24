import { createHash } from 'crypto'
import { cookies, draftMode } from 'next/headers'
import { createClient } from '@/lib/supabase/server'

// The filters every public analytics beacon applies before it writes a row, so
// the page-view log and the capture-event log count the same audience.
//
// Four things are deliberately NOT counted, because each one would quietly
// inflate the numbers with non-visitor traffic:
//   1. bots, by user-agent
//   2. anything not served from the production host — localhost and Vercel
//      preview deploys, matching how the Google/LinkedIn tags are gated
//   3. CMS draft previews
//   4. logged-in sessions: David and Nic browsing the live public site

const BOT_RE = /bot|crawl|spider|slurp|bing|yandex|baidu|duckduck|preview|fetch|monitor|headless|lighthouse|curl|wget|python-requests|axios|node-fetch/i
const PROD_HOSTS = new Set(['atlasbrief.la', 'www.atlasbrief.la'])

// Cheap checks that need no body: bots and non-production hosts.
export function requestSkipReason(req: Request): string | null {
  if (BOT_RE.test(req.headers.get('user-agent') || '')) return 'bot'
  const host = (req.headers.get('x-forwarded-host') || req.headers.get('host') || '')
    .split(':')[0]
    .toLowerCase()
  if (!PROD_HOSTS.has(host)) return 'non-prod'
  return null
}

// Checks that cost a lookup: draft mode and a signed-in admin. getUser() is a
// network round trip, so it only runs when an auth cookie is actually present;
// anonymous readers (nearly all traffic) skip it.
export async function sessionSkipReason(): Promise<string | null> {
  const { isEnabled: isDraft } = await draftMode()
  if (isDraft) return 'draft-preview'
  const jar = await cookies()
  if (jar.getAll().some(c => /^sb-.*-auth-token/.test(c.name))) {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (user) return 'admin'
  }
  return null
}

// Daily visitor hash from ip + ua — enough to dedupe a reader within a day,
// never reversible to the person.
export function visitorHash(req: Request): string {
  const ua = req.headers.get('user-agent') || ''
  const ip = (req.headers.get('x-forwarded-for') || '').split(',')[0].trim()
  const day = new Date().toISOString().slice(0, 10)
  return createHash('sha256').update(`${ip}|${ua}|${day}`).digest('hex').slice(0, 32)
}
