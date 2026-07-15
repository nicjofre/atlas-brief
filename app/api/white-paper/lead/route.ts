import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { sendLeadNotification } from '@/lib/resend'

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

  // Notify David (non-blocking — the row is the durable record).
  const notify = await sendLeadNotification({ name, email, company })
  if (!notify.ok) console.error('[white-paper] notify failed', notify.error)

  return NextResponse.json({ ok: true })
}
