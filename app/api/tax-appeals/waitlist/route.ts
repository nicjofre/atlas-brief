import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

export const runtime = 'nodejs'

// Tax-appeal service waitlist capture. The public /tax-appeals form posts here
// as the anon role. Email is required; name + property are optional qualifying
// context. Repeat signups are a silent success (we never reveal whether an
// address is already on the list).

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/

function cleanText(v: unknown, max: number): string | null {
  if (typeof v !== 'string') return null
  const s = v.trim().slice(0, max)
  return s.length > 0 ? s : null
}

export async function POST(req: Request) {
  let email: string
  let name: string | null = null
  let property: string | null = null
  try {
    const body = await req.json()
    email = typeof body?.email === 'string' ? body.email.trim().toLowerCase() : ''
    name = cleanText(body?.name, 120)
    property = cleanText(body?.property, 200)
  } catch {
    return NextResponse.json({ error: 'Invalid request.' }, { status: 400 })
  }

  if (!email || email.length > 254 || !EMAIL_RE.test(email)) {
    return NextResponse.json(
      { error: 'Please enter a valid email address.' },
      { status: 400 }
    )
  }

  const supabase = await createClient()

  // Plain INSERT — anon is insert-only by design (no SELECT so the list stays
  // private). Treat a unique-violation (23505 — already on the list) as a silent
  // success so a conflict and a fresh insert resolve to the same response.
  const { error } = await supabase
    .from('tax_appeal_waitlist')
    .insert({ email, name, property, source: 'tax_appeals_page' })

  if (error && error.code !== '23505') {
    console.error('[tax-waitlist] insert failed', error)
    return NextResponse.json(
      { error: 'Something went wrong. Please try again.' },
      { status: 500 }
    )
  }

  return NextResponse.json({ ok: true })
}
