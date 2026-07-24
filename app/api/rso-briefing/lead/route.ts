import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { sendBriefingEmail, sendLeadNotification, syncContactToResend, isReservedEmail } from '@/lib/resend'

export const runtime = 'nodejs'

// RSO Intelligence Briefing lead capture. The /rso-briefing form posts here as
// anon. Name + email required. Stores the lead, enrols them in the Friday
// dispatch (deduped), and emails the device-matched PDF. Mirrors the survival
// guide mechanism.

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/

function cleanText(v: unknown, max: number): string | null {
  if (typeof v !== 'string') return null
  const s = v.trim().slice(0, max)
  return s.length > 0 ? s : null
}

export async function POST(req: Request) {
  let email: string
  let name: string | null = null
  try {
    const body = await req.json()
    email = typeof body?.email === 'string' ? body.email.trim().toLowerCase() : ''
    name = cleanText(body?.name, 120)
  } catch {
    return NextResponse.json({ error: 'Invalid request.' }, { status: 400 })
  }

  if (!email || email.length > 254 || !EMAIL_RE.test(email) || isReservedEmail(email)) {
    return NextResponse.json({ error: 'Please enter a valid email address.' }, { status: 400 })
  }
  if (!name) {
    return NextResponse.json({ error: 'Please enter your name.' }, { status: 400 })
  }

  const supabase = await createClient()
  const { error } = await supabase
    .from('white_paper_leads')
    .insert({ name, email, company: null, source: 'rso_briefing' })

  if (error) {
    console.error('[rso-briefing] insert failed', error)
    return NextResponse.json({ error: 'Something went wrong. Please try again.' }, { status: 500 })
  }

  // Add them to the Friday dispatch (disclosed on the form). Unique email means
  // an existing subscriber no-ops on 23505.
  const firstName = name.split(/\s+/)[0] || null
  const lastName = name.split(/\s+/).slice(1).join(' ') || null
  const { error: subErr } = await supabase
    .from('subscribers')
    .insert({ email, status: 'subscribed', source: 'rso_briefing', first_name: firstName, last_name: lastName })
  if (subErr && subErr.code !== '23505') {
    console.error('[rso-briefing] subscribe failed', subErr)
  } else if (!subErr) {
    const sync = await syncContactToResend(email, { firstName, lastName })
    if (sync.ok === false && !sync.skipped) console.error('[rso-briefing] resend sync failed', sync.error)
  }

  // Email the briefing (device-matched PDF) and notify David. Best-effort — the
  // lead row is the durable record.
  const [briefing, notify] = await Promise.all([
    sendBriefingEmail({ to: email, name }),
    sendLeadNotification({ name, email, company: null, kind: 'RSO Briefing' }),
  ])
  if (!notify.ok) console.error('[rso-briefing] notify failed', notify.error)
  if (!briefing.ok) {
    console.error('[rso-briefing] briefing email failed', briefing.error)
    return NextResponse.json({ ok: true, emailed: false })
  }

  return NextResponse.json({ ok: true, emailed: true })
}
