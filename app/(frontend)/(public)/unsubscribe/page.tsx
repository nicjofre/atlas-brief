import type { Metadata } from 'next'
import Link from 'next/link'
import { verifyUnsubscribeToken } from '@/lib/email/unsubscribe-token'
import Footer from '../Footer'
import './unsubscribe.css'

// /unsubscribe — where the welcome email's Unsubscribe link lands (added
// 2026-11-01). Resend's hosted page only works for broadcasts, so one-off
// emails link here with a signed token. Opening the page changes nothing; the
// button does, so a mail scanner following the link can't unsubscribe anyone.

export const metadata: Metadata = {
  title: 'Unsubscribe · Atlas Brief',
  robots: { index: false, follow: false },
}

export const dynamic = 'force-dynamic'

export default async function UnsubscribePage({
  searchParams,
}: {
  searchParams: Promise<{ t?: string; done?: string; error?: string }>
}) {
  const { t, done, error } = await searchParams
  const email = done ? null : verifyUnsubscribeToken(t)

  return (
    <>
      <main className="wrap unsub">
        {done ? (
          <>
            <h1>You&rsquo;re unsubscribed.</h1>
            <p>You won&rsquo;t get any more emails from Atlas Brief. Changed your mind? You can <Link href="/subscribe">subscribe again</Link> any time.</p>
          </>
        ) : email ? (
          <>
            <h1>Unsubscribe from Atlas Brief?</h1>
            <p>We&rsquo;ll stop sending emails to <b>{email}</b>.</p>
            {error && <p className="unsub-err" role="alert">Something went wrong. Please try again.</p>}
            <form method="post" action="/api/unsubscribe">
              <input type="hidden" name="t" value={t} />
              <input type="hidden" name="from" value="page" />
              <button type="submit" className="unsub-btn">Unsubscribe</button>
            </form>
          </>
        ) : (
          <>
            <h1>This link doesn&rsquo;t work.</h1>
            <p>It may be incomplete or out of date. Use the Unsubscribe link at the bottom of any Atlas Brief email, or <Link href="/contact">contact us</Link> and we&rsquo;ll take you off the list.</p>
          </>
        )}
      </main>
      <Footer />
    </>
  )
}
