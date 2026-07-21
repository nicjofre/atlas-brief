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
export async function syncContactToResend(
  email: string,
  opts: { firstName?: string | null; lastName?: string | null } = {}
): Promise<SyncResult> {
  if (!resendConfigured()) return { ok: false, skipped: true }

  const audienceId = resendAudienceId()
  const firstName = opts.firstName?.trim()
  const lastName = opts.lastName?.trim()
  try {
    const res = await fetch(`${RESEND_API}/audiences/${audienceId}/contacts`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${resendKey()}`,
        'Content-Type': 'application/json',
      },
      // Resend natively carries email + first/last name only; role lives in
      // Supabase. first_name is included when the subscriber provided it.
      body: JSON.stringify({
        email,
        unsubscribed: false,
        ...(firstName ? { first_name: firstName } : {}),
        ...(lastName ? { last_name: lastName } : {}),
      }),
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

// RFC 2606 / 6761 reserved domains plus Resend's blocked placeholder. None can
// receive mail, and Resend HARD-REJECTS a whole broadcast if any @example.com
// address is in the audience — so we keep these out of signup and sweep any that
// slipped in before a send.
const RESERVED_EMAIL_DOMAINS = new Set(['example.com', 'example.org', 'example.net', 'localhost'])
const RESERVED_EMAIL_TLDS = ['.test', '.example', '.invalid', '.localhost']

export function isReservedEmail(email: string): boolean {
  const at = email.lastIndexOf('@')
  if (at < 0) return false
  const domain = email.slice(at + 1).toLowerCase()
  return RESERVED_EMAIL_DOMAINS.has(domain) || RESERVED_EMAIL_TLDS.some(t => domain.endsWith(t))
}

// List all contacts in the configured audience (used to sweep reserved ones).
export async function listResendContacts(): Promise<{ ok: boolean; contacts: { id: string; email: string }[]; error?: string }> {
  if (!resendConfigured()) return { ok: false, contacts: [], error: 'not configured' }
  try {
    const res = await fetch(`${RESEND_API}/audiences/${resendAudienceId()}/contacts`, {
      headers: { Authorization: `Bearer ${resendKey()}` },
    })
    const data = (await res.json().catch(() => ({}))) as { data?: { id: string; email: string }[]; message?: string }
    if (!res.ok) return { ok: false, contacts: [], error: data.message || `HTTP ${res.status}` }
    return { ok: true, contacts: (data.data ?? []).map(c => ({ id: c.id, email: c.email })) }
  } catch (err) {
    return { ok: false, contacts: [], error: err instanceof Error ? err.message : 'unknown error' }
  }
}

// Remove a contact from the audience by email. A 404 (already gone) is success.
export async function removeContactFromResend(email: string): Promise<{ ok: boolean; error?: string }> {
  if (!resendConfigured()) return { ok: false, error: 'not configured' }
  try {
    const res = await fetch(`${RESEND_API}/audiences/${resendAudienceId()}/contacts/${encodeURIComponent(email)}`, {
      method: 'DELETE',
      headers: { Authorization: `Bearer ${resendKey()}` },
    })
    if (!res.ok && res.status !== 404) {
      const data = (await res.json().catch(() => ({}))) as { message?: string }
      return { ok: false, error: data.message || `HTTP ${res.status}` }
    }
    return { ok: true }
  } catch (err) {
    return { ok: false, error: err instanceof Error ? err.message : 'unknown error' }
  }
}

// ===================================================================
// Sending the dispatch
// ===================================================================

// The dispatch sends from the verified atlasbrief.la domain; replies route to
// David's inbox.
export const DISPATCH_FROM = 'Atlas Brief <dispatch@atlasbrief.la>'
export const DISPATCH_REPLY_TO = 'David@atlasbrief.la'

type SendResult<T> =
  | { ok: true; data: T }
  | { ok: false; error: string }

async function resendPost<T>(path: string, body: unknown): Promise<SendResult<T>> {
  try {
    const res = await fetch(`${RESEND_API}${path}`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${resendKey()}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(body),
    })
    const data = (await res.json().catch(() => ({}))) as Record<string, unknown>
    if (!res.ok) {
      return { ok: false, error: (data.message as string) || `HTTP ${res.status}` }
    }
    return { ok: true, data: data as T }
  } catch (err) {
    return { ok: false, error: err instanceof Error ? err.message : 'unknown error' }
  }
}

// One-off email (used for the "send a test to me" step). Tokens are NOT filled
// by Resend here, so the caller substitutes samples before sending.
export function sendDispatchTest(args: {
  to: string
  subject: string
  html: string
}): Promise<SendResult<{ id: string }>> {
  if (!resendConfigured()) return Promise.resolve({ ok: false, error: 'Resend is not configured.' })
  return resendPost('/emails', {
    from: DISPATCH_FROM,
    to: [args.to],
    reply_to: DISPATCH_REPLY_TO,
    subject: args.subject,
    html: args.html,
  })
}

// Notify David when a deal is submitted through the header "Submit a Deal"
// popup. Sent to David, with reply_to set to the submitter so he can reply
// straight back to them. No-op (silent) when Resend isn't configured.
const DEAL_NOTIFY_TO = 'David@atlasbrief.la'

function escapeHtml(s: string): string {
  return s
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
}

export function sendDealNotification(args: {
  name: string
  email: string
  deal: string
  note: string | null
}): Promise<SendResult<{ id: string }>> {
  if (!resendConfigured()) return Promise.resolve({ ok: false, error: 'Resend is not configured.' })
  const rows: [string, string][] = [
    ['From', `${args.name} (${args.email})`],
    ['Deal', args.deal],
  ]
  if (args.note) rows.push(['Note', args.note])
  const html =
    `<div style="font-family:Georgia,serif;font-size:15px;color:#1a1a1a;line-height:1.6">` +
    `<p style="margin:0 0 14px;font-size:13px;letter-spacing:0.08em;text-transform:uppercase;color:#8B5A2B">New deal for an operator read</p>` +
    rows
      .map(
        ([k, v]) =>
          `<p style="margin:0 0 10px"><strong>${k}:</strong> ${escapeHtml(v)}</p>`
      )
      .join('') +
    `<p style="margin:18px 0 0;font-size:13px;color:#777">Reply to this email to respond to ${escapeHtml(args.name)} directly.</p>` +
    `</div>`
  return resendPost('/emails', {
    from: DISPATCH_FROM,
    to: [DEAL_NOTIFY_TO],
    reply_to: args.email,
    subject: `New deal submitted: ${args.deal.slice(0, 80)}`,
    html,
  })
}

// Email the Survival Guide PDF to the person who requested it. The PDF is
// attached by URL (Resend fetches the public /atlas-survival-guide.pdf), so we
// don't have to bundle the file into the serverless function. reply_to is David
// so a reply reaches him.
export function sendGuideEmail(args: {
  to: string
  name: string
}): Promise<SendResult<{ id: string }>> {
  if (!resendConfigured()) return Promise.resolve({ ok: false, error: 'Resend is not configured.' })
  const base = (process.env.NEXT_PUBLIC_SITE_URL || 'https://atlasbrief.la').replace(/\/$/, '')
  const first = args.name.trim().split(/\s+/)[0] || 'there'
  const html =
    `<div style="font-family:Georgia,serif;font-size:16px;color:#1a1a1a;line-height:1.6">` +
    `<p style="margin:0 0 14px">Hi ${escapeHtml(first)},</p>` +
    `<p style="margin:0 0 14px">Here's the Atlas Brief Survival Guide you asked for. It's attached as a PDF.</p>` +
    `<p style="margin:0 0 14px">It's the stuff I've figured out about not blowing yourself up on an apartment deal, in one place. If a question comes up, just reply to this email.</p>` +
    `<p style="margin:18px 0 0">David Safai<br/><span style="color:#8B5A2B">Atlas Brief</span></p>` +
    `</div>`
  return resendPost('/emails', {
    from: DISPATCH_FROM,
    to: [args.to],
    reply_to: DISPATCH_REPLY_TO,
    subject: 'Your Atlas Brief Survival Guide',
    html,
    attachments: [{ filename: 'Atlas-Brief-Survival-Guide.pdf', path: `${base}/atlas-survival-guide.pdf` }],
  })
}

// Notify David when someone downloads the Survival Guide white paper — a warm
// lead. reply_to is the requester so David can follow up directly.
export function sendLeadNotification(args: {
  name: string
  email: string
  company: string | null
}): Promise<SendResult<{ id: string }>> {
  if (!resendConfigured()) return Promise.resolve({ ok: false, error: 'Resend is not configured.' })
  const rows: [string, string][] = [['Name', args.name], ['Email', args.email]]
  if (args.company) rows.push(['Company', args.company])
  const html =
    `<div style="font-family:Georgia,serif;font-size:15px;color:#1a1a1a;line-height:1.6">` +
    `<p style="margin:0 0 14px;font-size:13px;letter-spacing:0.08em;text-transform:uppercase;color:#8B5A2B">New Survival Guide download</p>` +
    rows.map(([k, v]) => `<p style="margin:0 0 10px"><strong>${k}:</strong> ${escapeHtml(v)}</p>`).join('') +
    `<p style="margin:18px 0 0;font-size:13px;color:#777">Reply to this email to reach ${escapeHtml(args.name)} directly.</p>` +
    `</div>`
  return resendPost('/emails', {
    from: DISPATCH_FROM,
    to: [DEAL_NOTIFY_TO],
    reply_to: args.email,
    subject: `Survival Guide download: ${args.name}`,
    html,
  })
}

// Create a broadcast against the configured audience. Keep the live
// {{{FIRST_NAME}}} / unsubscribe tokens in the html so Resend fills them.
export function createDispatchBroadcast(args: {
  subject: string
  html: string
  name?: string
}): Promise<SendResult<{ id: string }>> {
  if (!resendConfigured()) return Promise.resolve({ ok: false, error: 'Resend is not configured.' })
  return resendPost('/broadcasts', {
    audience_id: resendAudienceId(),
    from: DISPATCH_FROM,
    reply_to: DISPATCH_REPLY_TO,
    subject: args.subject,
    html: args.html,
    name: args.name ?? args.subject,
  })
}

// Send (or schedule) a created broadcast. scheduledAt accepts an ISO timestamp
// or Resend's natural language (e.g. "in 1 hour"); omit to send immediately.
export function sendDispatchBroadcast(
  broadcastId: string,
  opts: { scheduledAt?: string } = {}
): Promise<SendResult<{ id: string }>> {
  if (!resendConfigured()) return Promise.resolve({ ok: false, error: 'Resend is not configured.' })
  return resendPost(`/broadcasts/${broadcastId}/send`, {
    ...(opts.scheduledAt ? { scheduled_at: opts.scheduledAt } : {}),
  })
}
