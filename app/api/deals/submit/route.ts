import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { sendDealNotification } from '@/lib/resend'

export const runtime = 'nodejs'

// "Submit a deal for an operator read" capture. The header popup posts here as
// the anon role. Name, email, and the deal (address / link / description) are
// required; note is optional. No dedup — the same person may submit many deals.
//
// DISABLED 2026-09-09. The CTA was pulled from the header for spam, but hiding
// the button doesn't stop a bot — this route is public and unauthenticated, and
// every accepted POST both writes a row and emails David. So it's gated off by
// default: set DEALS_ENABLED=1 in the environment to turn it back on. Reads are
// unaffected — /analytics still lists the submissions already collected.
//
// Answers 404 rather than 403: a disabled endpoint shouldn't confirm it exists,
// and bots retire a "not found" faster than a "forbidden".
const DEALS_ENABLED = process.env.DEALS_ENABLED === '1'

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/

function cleanText(v: unknown, max: number): string | null {
  if (typeof v !== 'string') return null
  const s = v.trim().slice(0, max)
  return s.length > 0 ? s : null
}

export async function POST(req: Request) {
  // Bail before parsing, the DB write, or the notification email — a disabled
  // endpoint should cost nothing and reach nothing.
  if (!DEALS_ENABLED) {
    return NextResponse.json({ error: 'Not found.' }, { status: 404 })
  }

  let email: string
  let name: string | null = null
  let deal: string | null = null
  let note: string | null = null
  try {
    const body = await req.json()
    email = typeof body?.email === 'string' ? body.email.trim().toLowerCase() : ''
    name = cleanText(body?.name, 120)
    deal = cleanText(body?.deal, 1000)
    note = cleanText(body?.note, 2000)
  } catch {
    return NextResponse.json({ error: 'Invalid request.' }, { status: 400 })
  }

  if (!email || email.length > 254 || !EMAIL_RE.test(email)) {
    return NextResponse.json({ error: 'Please enter a valid email address.' }, { status: 400 })
  }
  if (!name) {
    return NextResponse.json({ error: 'Please enter your name.' }, { status: 400 })
  }
  if (!deal) {
    return NextResponse.json({ error: 'Please add the deal — an address, link, or short description.' }, { status: 400 })
  }

  const supabase = await createClient()
  const { error } = await supabase
    .from('deal_submissions')
    .insert({ name, email, deal, note, source: 'header_cta' })

  if (error) {
    console.error('[deal-submit] insert failed', error)
    return NextResponse.json({ error: 'Something went wrong. Please try again.' }, { status: 500 })
  }

  // Notify David by email (reply_to = submitter). The DB row is the durable
  // record, so a failed notification doesn't fail the submission.
  const notify = await sendDealNotification({ name, email, deal, note })
  if (!notify.ok) {
    console.error('[deal-submit] notify failed', notify.error)
  }

  return NextResponse.json({ ok: true })
}
