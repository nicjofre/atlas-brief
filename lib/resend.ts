// Resend integration — the *sending layer* for the Friday dispatch.
//
// Resend is a developer email API, not a CMS: it owns delivery and the hosted
// unsubscribe page, while our `subscribers` table owns the list. We talk to it
// over plain REST (via fetch) so there's no SDK dependency to carry before the
// account even exists. Every function is a no-op when the env isn't configured,
// so capture (Supabase) keeps working and the Resend mirror lights up the
// moment RESEND_API_KEY + RESEND_AUDIENCE_ID are set.
//
// Env:
//   RESEND_API_KEY      — secret API key from resend.com
//   RESEND_AUDIENCE_ID  — the Audience (subscriber list) to mirror into

const RESEND_API = 'https://api.resend.com'

// Env values are read trimmed: Vercel/CI env editors silently keep trailing
// whitespace, and the audience id goes straight into a URL path
// (/audiences/<id>/contacts) where a stray space breaks the request.
function resendKey(): string {
  return (process.env.RESEND_API_KEY ?? '').trim()
}
function resendAudienceId(): string {
  return (process.env.RESEND_AUDIENCE_ID ?? '').trim()
}

export function resendConfigured(): boolean {
  return Boolean(resendKey() && resendAudienceId())
}

type SyncResult =
  | { ok: true; contactId: string | null }
  | { ok: false; skipped: true }
  | { ok: false; skipped: false; error: string }

/**
 * Mirror a subscriber into the configured Resend Audience. Idempotent: Resend
 * upserts contacts by email within an audience. Returns the contact id so the
 * caller can persist it back onto the subscribers row.
 */
export async function syncContactToResend(email: string): Promise<SyncResult> {
  if (!resendConfigured()) return { ok: false, skipped: true }

  const audienceId = resendAudienceId()
  try {
    const res = await fetch(`${RESEND_API}/audiences/${audienceId}/contacts`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${resendKey()}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ email, unsubscribed: false }),
    })

    const data = (await res.json().catch(() => ({}))) as {
      id?: string
      message?: string
    }

    if (!res.ok) {
      return { ok: false, skipped: false, error: data.message || `HTTP ${res.status}` }
    }
    return { ok: true, contactId: data.id ?? null }
  } catch (err) {
    return {
      ok: false,
      skipped: false,
      error: err instanceof Error ? err.message : 'unknown error',
    }
  }
}
