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

export async function POST(req: Request) {
  let email: string
  try {
    const body = await req.json()
    email = typeof body?.email === 'string' ? body.email.trim().toLowerCase() : ''
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

  // Plain INSERT — not upsert. Anon is insert-only by design (no SELECT so the
  // list stays private, no UPDATE so existing rows can't be flipped). PostgREST's
  // upsert ON CONFLICT path requires an UPDATE policy, which anon intentionally
  // lacks, so it would fail RLS. Instead we insert and treat a unique-violation
  // (23505 — already subscribed) as a silent success: a conflict and a fresh
  // insert both resolve to the same "you're on the list" response, never
  // revealing whether an address is already on the list.
  const { error } = await supabase
    .from('subscribers')
    .insert({ email, status: 'subscribed', source: 'home_dispatch_form' })

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
  const sync = await syncContactToResend(email)
  if (sync.ok === false && !sync.skipped) {
    console.error('[subscribe] resend sync failed', sync.error)
  }

  return NextResponse.json({ ok: true })
}
