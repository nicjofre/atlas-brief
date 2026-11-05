import { createHmac, timingSafeEqual } from 'crypto'

// Signed unsubscribe links for one-off emails (the welcome email). Resend's
// {{{RESEND_UNSUBSCRIBE_URL}}} only works in broadcasts, so a one-off send
// links to our own /unsubscribe with a token that proves the link came from
// us: base64url(email) + "." + HMAC(email). No database lookup to make one,
// and nobody can unsubscribe an address they only guessed.
//
// The key is derived from PAYLOAD_SECRET (already set everywhere the site
// runs) under its own label, so it never equals the Payload secret itself.
// Rotating PAYLOAD_SECRET invalidates old links; the page then says the link
// has expired.

function key(): Buffer {
  const secret = process.env.PAYLOAD_SECRET
  if (!secret) throw new Error('PAYLOAD_SECRET is not set')
  return createHmac('sha256', secret).update('atlas-brief:unsubscribe:v1').digest()
}

function sign(email: string): string {
  return createHmac('sha256', key()).update(email).digest('base64url')
}

export function unsubscribeToken(email: string): string {
  const e = email.trim().toLowerCase()
  return `${Buffer.from(e).toString('base64url')}.${sign(e)}`
}

// The email the token was made for, or null if it's malformed or forged.
export function verifyUnsubscribeToken(token: string | null | undefined): string | null {
  if (!token) return null
  const [b64, sig] = token.split('.')
  if (!b64 || !sig) return null
  const email = Buffer.from(b64, 'base64url').toString('utf8')
  if (!email.includes('@')) return null
  const expected = Buffer.from(sign(email))
  const given = Buffer.from(sig)
  return given.length === expected.length && timingSafeEqual(given, expected) ? email : null
}
