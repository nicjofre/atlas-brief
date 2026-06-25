import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { syncContactToResend } from '@/lib/resend'

export const runtime = 'nodejs'

// Friday dispatch signup. The public form posts here as the anon role.
//
// Flow: validate + normalize the email, capture it in our `subscribers` table
// (the source of truth), then mirror it to the Resend Audience if Resend is
// configured. Repeat signups are a silent success — we never reveal whether an
// address is already on the list.

// Deliberately permissive: a single @ with a dot in the domain. Real validation
// is delivery itself; this only catches obvious typos/garbage before storage.
const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/

// Optional profile collected by the signup pop-up. Role is constrained to a
// known set so it stays clean for segmentation; anything else is dropped.
const ROLES = ['Broker', 'Investor', 'Owner-Operator', 'Lender', 'Other']

function cleanText(v: unknown, max: number): string | null {
  if (typeof v !== 'string') return null
  const s = v.trim().slice(0, max)
  return s.length > 0 ? s : null
}

export async function POST(req: Request) {
  let email: string
  let firstName: string | null = null
  let lastName: string | null = null
  let role: string | null = null
  try {
    const body = await req.json()
    email = typeof body?.email === 'string' ? body.email.trim().toLowerCase() : ''
    firstName = cleanText(body?.first_name, 80)
    lastName = cleanText(body?.last_name, 80)
    const r = cleanText(body?.role, 40)
    role = r && ROLES.includes(r) ? r : null
  } catch {
    return NextResponse.json({ error: 'Invalid request.' }, { status: 400 })
  }

  if (!email || email.length > 254 || !EMAIL_RE.test(email)) {
    return NextResponse.json(
      { error: 'Please enter a valid email address.' },
      { status: 400 }
    )
  }

  // First + last name are required (the signup pop-up enforces this; the API
  // guards it too so direct posts can't create nameless rows). Role stays
  // optional.
  if (!firstName || !lastName) {
    return NextResponse.json(
      { error: 'Please enter your first and last name.' },
      { status: 400 }
    )
  }

  const supabase = await createClient()

  // Plain INSERT — not upsert. Anon is insert-only by design (no SELECT so the
  // list stays private, no UPDATE so existing rows can't be flipped). PostgREST's
  // upsert ON CONFLICT path requires an UPDATE policy, which anon intentionally
  // lacks, so it would fail RLS. Instead we insert and treat a unique-violation
  // (23505 — already subscribed) as a silent success: a conflict and a fresh
  // insert both resolve to the same "you're on the list" response, never
  // revealing whether an address is already on the list.
  const { error } = await supabase
    .from('subscribers')
    .insert({ email, status: 'subscribed', source: 'home_dispatch_form', first_name: firstName, last_name: lastName, role })

  if (error && error.code !== '23505') {
    console.error('[subscribe] insert failed', error)
    return NextResponse.json(
      { error: 'Something went wrong. Please try again.' },
      { status: 500 }
    )
  }

  // Mirror into Resend (no-op until the key is configured). We don't fail the
  // signup if the mirror errors — the Supabase row is the durable record and
  // can be back-synced later.
  const sync = await syncContactToResend(email, { firstName, lastName })
  if (sync.ok === false && !sync.skipped) {
    console.error('[subscribe] resend sync failed', sync.error)
  }

  return NextResponse.json({ ok: true })
}
