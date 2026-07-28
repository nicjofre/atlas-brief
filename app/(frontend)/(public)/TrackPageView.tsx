'use client'

import { usePathname } from 'next/navigation'
import { useEffect, useRef } from 'react'

// Sitewide reader-analytics beacon. Mounted once in the public layout, so it
// covers every public page — home, The Tape, articles, the landing pages — not
// just articles. The internal tools (/analytics, /listings, /development, /cms)
// don't use this layout, so admin browsing is never recorded here at all.
//
// Everything else that shouldn't count is filtered server-side in
// /api/track/view: bots, non-production hosts, logged-in sessions (David and
// Nic clicking around the live site), and CMS draft previews.
//
// Fires on first load AND on client-side navigation — moving between pages in
// the App Router never reloads the document, so without the usePathname
// dependency we'd only ever see the first page of a visit.

const SOCIAL_RE = /linkedin|lnkd|x\.com|twitter|t\.co|facebook|fb\.|instagram|reddit/i

// How the visitor reached the *site*. Only meaningful for the first page of a
// visit; every page after that is an internal click.
function classifyArrival(): string {
  const params = new URLSearchParams(window.location.search)
  const ref = (params.get('ref') || params.get('utm_source') || '').toLowerCase()
  if (ref === 'dispatch' || ref === 'email') return 'email'

  const referrer = document.referrer || ''
  if (!referrer) return 'direct'

  let host = ''
  try {
    host = new URL(referrer).hostname
  } catch {}
  // A same-host referrer means they clicked through from another Atlas page
  // (a full page load rather than a client-side nav), not a fresh arrival.
  if (!host || host.includes(window.location.hostname)) return 'internal'

  return SOCIAL_RE.test(host) ? 'social' : 'other'
}

// Dispatch links carry ?rid=<the recipient's own address>, filled per-recipient
// by Resend, so a read can be tied to the subscriber who got the email. Two
// things happen to it here and nowhere else:
//
//   1. It's read once and handed to the beacon, which resolves it server-side
//      to a subscriber id. The address itself is never stored on the view row.
//   2. It's stripped from the URL immediately, before the reader can copy the
//      link, share it, or leak it to another site in a referrer header. The
//      server sets a cookie on that first beacon, so the rest of the visit
//      still attributes without the address riding along in the URL.
//
// replaceState (not pushState) so the scrub doesn't add a history entry — Back
// should leave the site, not return to the same page with the param on.
function takeReaderId(): string {
  try {
    const url = new URL(window.location.href)
    // A '+' in an address decodes to a space; put it back before it travels.
    const rid = (url.searchParams.get('rid') || '').replace(/ /g, '+').trim()
    if (!rid) return ''
    url.searchParams.delete('rid')
    window.history.replaceState(window.history.state, '', url.toString())
    return rid.slice(0, 320)
  } catch {
    return ''
  }
}

function send(payload: { path: string; source: string; referrer: string; rid?: string }): void {
  const body = JSON.stringify(payload)
  const url = '/api/track/view'
  if (navigator.sendBeacon) {
    navigator.sendBeacon(url, new Blob([body], { type: 'application/json' }))
  } else {
    void fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body,
      keepalive: true,
    })
  }
}

export default function TrackPageView() {
  const pathname = usePathname()
  // The last path we reported. Still null means we haven't reported anything
  // yet, which also tells us this is the visit's first page.
  const reported = useRef<string | null>(null)

  useEffect(() => {
    if (!pathname || reported.current === pathname) return
    const isFirstOfVisit = reported.current === null
    reported.current = pathname

    try {
      // Payload's Live Preview renders the public page inside an iframe. Don't
      // count an editor reviewing a draft as a reader. (Draft mode is also
      // rejected server-side; this saves the round trip.)
      if (window.self !== window.top) return

      // Only the landing page of a dispatch click carries rid; every page after
      // it attributes off the cookie the server set on this first beacon.
      const rid = isFirstOfVisit ? takeReaderId() : ''

      send({
        path: pathname,
        source: isFirstOfVisit ? classifyArrival() : 'internal',
        referrer: isFirstOfVisit ? (document.referrer || '').slice(0, 400) : '',
        ...(rid ? { rid } : {}),
      })
    } catch {
      // analytics must never break the page
    }
  }, [pathname])

  return null
}
