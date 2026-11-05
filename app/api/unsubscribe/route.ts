import { NextResponse } from 'next/server'
import { verifyUnsubscribeToken } from '@/lib/email/unsubscribe-token'
import { unsubscribeEmail } from '@/lib/email/unsubscribe'

export const runtime = 'nodejs'

// Unsubscribe from a one-off email (the welcome email). Two callers:
//   - the /unsubscribe page's button, a form post that's sent back to the page;
//   - a mail app's own Unsubscribe button (RFC 8058 one-click), which POSTs
//     here with the token in the URL and wants a plain 200.
// POST only: link scanners prefetch GETs, and a GET that unsubscribed would
// take people off the list without them clicking anything.
export async function POST(req: Request) {
  const url = new URL(req.url)
  let token = url.searchParams.get('t')
  let fromPage = false
  const type = req.headers.get('content-type') ?? ''
  if (type.includes('form')) {
    const form = await req.formData().catch(() => null)
    fromPage = form?.get('from') === 'page'
    token = token ?? (form?.get('t') as string | null) ?? null
  }

  const email = verifyUnsubscribeToken(token)
  const result = email ? await unsubscribeEmail(email) : { ok: false }

  if (fromPage) {
    const back = new URL('/unsubscribe', url.origin)
    if (result.ok) back.searchParams.set('done', '1')
    else {
      back.searchParams.set('t', token ?? '')
      back.searchParams.set('error', '1')
    }
    return NextResponse.redirect(back, 303)
  }
  if (!email) return NextResponse.json({ error: 'Invalid link.' }, { status: 400 })
  return NextResponse.json({ ok: result.ok }, { status: result.ok ? 200 : 500 })
}
