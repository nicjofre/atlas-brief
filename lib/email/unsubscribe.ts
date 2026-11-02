import { Client } from 'pg'
import { removeContactFromResend } from '@/lib/resend'

// Takes an address off the list: marks the subscribers row unsubscribed (the
// source of truth, so future broadcasts skip it) and removes the Resend
// contact. Over the direct DB connection, like the Resend webhook: anon can't
// update subscribers by design. Callers verify the signed token first.
export async function unsubscribeEmail(email: string): Promise<{ ok: boolean }> {
  const c = new Client({ connectionString: process.env.DATABASE_URI })
  try {
    await c.connect()
    await c.query(
      `update subscribers
          set status = 'unsubscribed', unsubscribed_at = now(), updated_at = now()
        where email = $1 and status = 'subscribed'`,
      [email]
    )
  } catch (e) {
    console.error('[unsubscribe] db update failed', e instanceof Error ? e.message : e)
    return { ok: false }
  } finally {
    await c.end().catch(() => {})
  }
  // The row is what counts; a Resend miss is logged and can be swept later.
  const r = await removeContactFromResend(email)
  if (!r.ok && r.error !== 'not configured') console.error('[unsubscribe] resend remove failed', r.error)
  return { ok: true }
}
