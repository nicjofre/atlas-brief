import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { renderRoundupHtml } from '@/lib/email/render-roundup'
import {
  formatDispatchDate,
  RESEND_FIRST_NAME,
  RESEND_UNSUBSCRIBE_TOKEN,
} from '@/lib/email/build-roundup'
import {
  sendDispatchTest,
  createDispatchBroadcast,
  sendDispatchBroadcast,
  DISPATCH_REPLY_TO,
  isReservedEmail,
  listResendContacts,
  removeContactFromResend,
} from '@/lib/resend'

export const runtime = 'nodejs'
export const maxDuration = 60

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/

// Send the dispatch. action:
//   'test'     -> render with a sample greeting and email it to one address
//   'send'     -> create + send a broadcast to the audience now
//   'schedule' -> create + send a broadcast at scheduled_at
// Tokens ({{{FIRST_NAME}}}, unsubscribe) stay live in broadcast HTML so Resend
// fills them per-recipient; the test render swaps in samples. Admin only.
export async function POST(req: Request) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  let body: {
    slugs?: unknown
    intro?: unknown
    subject?: unknown
    action?: unknown
    scheduled_at?: unknown
    test_email?: unknown
  }
  try {
    body = await req.json()
  } catch {
    return NextResponse.json({ error: 'Invalid request.' }, { status: 400 })
  }

  const slugs = Array.isArray(body.slugs) ? body.slugs.filter((s): s is string => typeof s === 'string') : []
  const intro = typeof body.intro === 'string' ? body.intro.trim() : ''
  const subject = typeof body.subject === 'string' ? body.subject.trim() : ''
  const action = body.action
  const scheduledAt = typeof body.scheduled_at === 'string' ? body.scheduled_at : ''

  if (action !== 'test' && action !== 'send' && action !== 'schedule') {
    return NextResponse.json({ error: 'Unknown action.' }, { status: 400 })
  }
  if (slugs.length === 0) return NextResponse.json({ error: 'Pick at least one deal.' }, { status: 400 })
  if (!subject) return NextResponse.json({ error: 'Add a subject line.' }, { status: 400 })

  // -------- test --------
  if (action === 'test') {
    const to = typeof body.test_email === 'string' && EMAIL_RE.test(body.test_email.trim())
      ? body.test_email.trim()
      : DISPATCH_REPLY_TO
    const { html, count } = await renderRoundupHtml({
      slugs, intro, greeting: 'there', unsubscribeUrl: '#',
      dateline: formatDispatchDate(new Date()),
    })
    if (count === 0) return NextResponse.json({ error: 'None of the selected deals could be rendered.' }, { status: 400 })
    const res = await sendDispatchTest({ to, subject: `[TEST] ${subject}`, html })
    if (!res.ok) return NextResponse.json({ error: res.error }, { status: 502 })
    return NextResponse.json({ ok: true, sentTo: to })
  }

  // -------- send / schedule --------
  let sendDate = new Date()
  if (action === 'schedule') {
    const d = new Date(scheduledAt)
    if (Number.isNaN(d.getTime()) || d.getTime() < Date.now() + 60_000) {
      return NextResponse.json({ error: 'Pick a schedule time at least a minute in the future.' }, { status: 400 })
    }
    sendDate = d
  }

  const { html, count } = await renderRoundupHtml({
    slugs, intro,
    greeting: RESEND_FIRST_NAME,
    unsubscribeUrl: RESEND_UNSUBSCRIBE_TOKEN,
    dateline: formatDispatchDate(sendDate),
  })
  if (count === 0) return NextResponse.json({ error: 'None of the selected deals could be rendered.' }, { status: 400 })

  // Resend hard-rejects the whole broadcast if the audience contains a reserved
  // domain (e.g. @example.com). Sweep any out of the audience — and our table —
  // so the send self-heals instead of failing.
  const list = await listResendContacts()
  if (list.ok) {
    for (const c of list.contacts.filter(c => isReservedEmail(c.email))) {
      await removeContactFromResend(c.email)
      await supabase.from('subscribers').delete().ilike('email', c.email)
    }
  }

  const created = await createDispatchBroadcast({ subject, html, name: `${subject} (${formatDispatchDate(sendDate)})` })
  if (!created.ok) return NextResponse.json({ error: `Could not create broadcast: ${created.error}` }, { status: 502 })

  const sent = await sendDispatchBroadcast(created.data.id, {
    scheduledAt: action === 'schedule' ? sendDate.toISOString() : undefined,
  })
  if (!sent.ok) {
    return NextResponse.json(
      { error: `Broadcast created but send failed: ${sent.error}`, broadcastId: created.data.id },
      { status: 502 }
    )
  }

  return NextResponse.json({
    ok: true,
    broadcastId: created.data.id,
    scheduled: action === 'schedule',
    scheduledAt: action === 'schedule' ? sendDate.toISOString() : null,
  })
}
