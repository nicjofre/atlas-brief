import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

export const runtime = 'nodejs'

// "Submit a deal for an operator read" capture. The header popup posts here as
// the anon role. Name, email, and the deal (address / link / description) are
// required; note is optional. No dedup — the same person may submit many deals.

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/

function cleanText(v: unknown, max: number): string | null {
  if (typeof v !== 'string') return null
  const s = v.trim().slice(0, max)
  return s.length > 0 ? s : null
}

export async function POST(req: Request) {
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

  return NextResponse.json({ ok: true })
}
