import { NextResponse } from 'next/server'
import { createHmac, timingSafeEqual } from 'crypto'
import { Client } from 'pg'

export const runtime = 'nodejs'

// Resend email-engagement webhook. Resend POSTs delivered/opened/clicked/etc.
// events here, signed Svix-style. We verify the signature, then record the event
// in email_events via the direct DB connection (the table has no anon/auth
// insert policy, so a forged unsigned POST can't write). Configure in Resend:
//   Webhooks -> Add -> https://atlasbrief.la/api/webhooks/resend
//   then set RESEND_WEBHOOK_SECRET (the whsec_... signing secret) in the env.

function verifySvix(secret: string, headers: Headers, body: string): boolean {
  const id = headers.get('svix-id')
  const ts = headers.get('svix-timestamp')
  const sigHeader = headers.get('svix-signature')
  if (!id || !ts || !sigHeader) return false

  // Reject stale deliveries (replay guard): 5 minute tolerance.
  const tsNum = Number(ts)
  if (!Number.isFinite(tsNum) || Math.abs(Date.now() / 1000 - tsNum) > 300) return false

  const key = Buffer.from(secret.replace(/^whsec_/, ''), 'base64')
  const expected = createHmac('sha256', key).update(`${id}.${ts}.${body}`).digest('base64')
  const expectedBuf = Buffer.from(expected)
  // svix-signature is space-separated "v1,<sig>" entries.
  return sigHeader.split(' ').some((part) => {
    const sig = part.split(',')[1]
    if (!sig) return false
    const sigBuf = Buffer.from(sig)
    return sigBuf.length === expectedBuf.length && timingSafeEqual(sigBuf, expectedBuf)
  })
}

export async function POST(req: Request) {
  const secret = process.env.RESEND_WEBHOOK_SECRET?.trim()
  if (!secret) {
    console.error('[webhooks/resend] RESEND_WEBHOOK_SECRET not set')
    return NextResponse.json({ error: 'Webhook not configured.' }, { status: 500 })
  }

  const raw = await req.text()
  if (!verifySvix(secret, req.headers, raw)) {
    return NextResponse.json({ error: 'Invalid signature.' }, { status: 401 })
  }

  let payload: {
    type?: string
    data?: {
      email_id?: string
      broadcast_id?: string
      to?: string[] | string
      email?: string
      click?: { link?: string }
    }
  }
  try {
    payload = JSON.parse(raw)
  } catch {
    return NextResponse.json({ error: 'Bad JSON.' }, { status: 400 })
  }

  const type = (payload.type || '').replace(/^email\./, '') || 'unknown'
  const data = payload.data || {}
  const email = Array.isArray(data.to) ? data.to[0] : data.to || data.email || null
  const broadcastId = data.broadcast_id || null
  const link = data.click?.link || null
  const resendEmailId = data.email_id || null

  const c = new Client({ connectionString: process.env.DATABASE_URI })
  try {
    await c.connect()
    await c.query(
      `insert into email_events (type, email, broadcast_id, link, resend_email_id, raw)
       values ($1, $2, $3, $4, $5, $6)`,
      [type, email, broadcastId, link, resendEmailId, payload]
    )
  } catch (e) {
    console.error('[webhooks/resend] insert failed', e instanceof Error ? e.message : e)
    // 200 anyway so Resend doesn't hammer retries on a transient DB blip; the
    // signed event is logged above for replay if needed.
    return NextResponse.json({ ok: false }, { status: 200 })
  } finally {
    await c.end().catch(() => {})
  }

  return NextResponse.json({ ok: true })
}
