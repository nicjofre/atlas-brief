import { NextResponse } from 'next/server'

export const runtime = 'nodejs'

// TEMPORARY diagnostic — remove after debugging the Resend wiring.
// Reports env-var presence and live Resend API reachability WITHOUT leaking
// any secret value. Guarded by a token so it can't be casually probed.
const DIAG_TOKEN = 'atlas-diag-7f3a91'

export async function GET(req: Request) {
  const url = new URL(req.url)
  if (url.searchParams.get('t') !== DIAG_TOKEN) {
    return NextResponse.json({ error: 'forbidden' }, { status: 403 })
  }

  const key = process.env.RESEND_API_KEY
  const audienceId = process.env.RESEND_AUDIENCE_ID

  const out: Record<string, unknown> = {
    env: {
      RESEND_API_KEY_present: Boolean(key),
      RESEND_API_KEY_len: key?.length ?? 0,
      RESEND_API_KEY_prefix: key ? key.slice(0, 3) : null,
      RESEND_AUDIENCE_ID_present: Boolean(audienceId),
      RESEND_AUDIENCE_ID_value: audienceId ?? null, // audience id is not secret
      NEXT_PUBLIC_SITE_URL: process.env.NEXT_PUBLIC_SITE_URL ?? null,
    },
  }

  if (!key) {
    out.note = 'RESEND_API_KEY missing — sync would be skipped (no-op)'
    return NextResponse.json(out)
  }

  // 1) Is the key valid? List audiences (also reveals the real audience ids).
  try {
    const res = await fetch('https://api.resend.com/audiences', {
      headers: { Authorization: `Bearer ${key}` },
    })
    const body = (await res.json().catch(() => ({}))) as {
      data?: Array<{ id: string; name: string }>
      message?: string
    }
    out.listAudiences = {
      httpStatus: res.status,
      ok: res.ok,
      message: body.message ?? null,
      audiences: body.data?.map(a => ({ id: a.id, name: a.name })) ?? null,
    }
  } catch (e) {
    out.listAudiences = { error: e instanceof Error ? e.message : 'unknown' }
  }

  // 2) Does the configured audience exist?
  if (audienceId) {
    try {
      const res = await fetch(`https://api.resend.com/audiences/${audienceId}`, {
        headers: { Authorization: `Bearer ${key}` },
      })
      const body = (await res.json().catch(() => ({}))) as { message?: string }
      out.getConfiguredAudience = {
        httpStatus: res.status,
        ok: res.ok,
        message: body.message ?? null,
      }
    } catch (e) {
      out.getConfiguredAudience = { error: e instanceof Error ? e.message : 'unknown' }
    }
  }

  return NextResponse.json(out)
}
