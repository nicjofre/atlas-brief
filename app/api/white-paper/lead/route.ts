import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { sendGuideEmail, sendLeadNotification, syncContactToResend } from '@/lib/resend'

export const runtime = 'nodejs'

// Survival Guide lead capture. The /survival-guide form posts here as anon.
// Name + email required; company optional. On success the client reveals the
// download link. No dedup — someone may grab the guide more than once.

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/

function cleanText(v: unknown, max: number): string | null {
  if (typeof v !== 'string') return null
  const s = v.trim().slice(0, max)
  return s.length > 0 ? s : null
}

export async function POST(req: Request) {
  let email: string
  let name: string | null = null
  let company: string | null = null
  try {
    const body = await req.json()
    email = typeof body?.email === 'string' ? body.email.trim().toLowerCase() : ''
    name = cleanText(body?.name, 120)
    company = cleanText(body?.company, 160)
  } catch {
    return NextResponse.json({ error: 'Invalid request.' }, { status: 400 })
  }

  if (!email || email.length > 254 || !EMAIL_RE.test(email)) {
    return NextResponse.json({ error: 'Please enter a valid email address.' }, { status: 400 })
  }
  if (!name) {
    return NextResponse.json({ error: 'Please enter your name.' }, { status: 400 })
  }

  const supabase = await createClient()
  const { error } = await supabase
    .from('white_paper_leads')
    .insert({ name, email, company, source: 'survival_guide' })

  if (error) {
    console.error('[white-paper] insert failed', error)
    return NextResponse.json({ error: 'Something went wrong. Please try again.' }, { status: 500 })
  }

  // Also add them to the Friday dispatch list (disclosed on the form). The
  // subscribers table has a unique email, so an existing subscriber just
  // no-ops on 23505 — no duplicate, no status change.
  const firstName = name.split(/\s+/)[0] || null
  const lastName = name.split(/\s+/).slice(1).join(' ') || null
  const { error: subErr } = await supabase
    .from('subscribers')
    .insert({ email, status: 'subscribed', source: 'survival_guide', first_name: firstName, last_name: lastName })
  if (subErr && subErr.code !== '23505') {
    console.error('[white-paper] subscribe failed', subErr)
  } else if (!subErr) {
    // Only mirror brand-new subscribers into the Resend audience.
    const sync = await syncContactToResend(email, { firstName, lastName })
    if (sync.ok === false && !sync.skipped) console.error('[white-paper] resend sync failed', sync.error)
  }

  // Email the guide (PDF attached) to the requester, and notify David. Both are
  // best-effort: the lead row is the durable record. If the guide email fails,
  // tell the client so it can offer the direct download as a fallback.
  const [guide, notify] = await Promise.all([
    sendGuideEmail({ to: email, name }),
    sendLeadNotification({ name, email, company }),
  ])
  if (!notify.ok) console.error('[white-paper] notify failed', notify.error)
  if (!guide.ok) {
    console.error('[white-paper] guide email failed', guide.error)
    return NextResponse.json({ ok: true, emailed: false })
  }

  return NextResponse.json({ ok: true, emailed: true })
}
