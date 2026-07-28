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

// A view only counts once the page has been open this long.
//
// Corporate mail gateways scan every link in a dispatch before delivering it,
// and they do it with a real rendering engine — they run our JavaScript and
// present a browser user-agent, so the user-agent bot filter never sees them.
// On the Jul 20 dispatch that produced 114 phantom page views inside five
// minutes, from 21 "visitors" who were mail scanners.
//
// What separates them from a reader is dwell: a scanner loads, inspects, and
// leaves in about a second, while a person stays. So we wait before recording
// anything and drop the view if the page is gone or hidden by then. This costs
// us genuine sub-4-second visits, which is the right trade — those aren't reads.
//
// This matters most for attribution: without it, a scanner following
// ?rid=jane@firm.com would file five articles under Jane, who never opened the
// email at all.
const DWELL_MS = 4000

// The reader id survives a dropped beacon. If someone lands from a dispatch,
// leaves that first page inside the dwell window, and settles on the next one,
// their identity should still reach the server — otherwise the whole visit goes
// anonymous. Module scope, so it persists across client-side navigations but
// dies with the tab. Cleared once a beacon has actually gone out.
let pendingRid = ''

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
  // The last path we actually SENT. Deliberately not set when the timer starts:
  // an effect that gets torn down before the dwell elapses (a fast bounce, or
  // React re-running the effect in development) must leave this untouched, or
  // the retry sees the path as already reported and the view is lost. Still
  // null also means nothing has been counted yet, i.e. this is the visit's
  // first counted page.
  const reported = useRef<string | null>(null)

  useEffect(() => {
    if (!pathname || reported.current === pathname) return
    const isFirstOfVisit = reported.current === null

    try {
      // Payload's Live Preview renders the public page inside an iframe. Don't
      // count an editor reviewing a draft as a reader. (Draft mode is also
      // rejected server-side; this saves the round trip.)
      if (window.self !== window.top) return

      // Automation drives itself with this flag set; a real browser doesn't.
      // Catches the headless scanners that bother to spoof a user-agent.
      if (navigator.webdriver) return

      // Read the identity out of the URL straight away — the scrub shouldn't
      // wait on the dwell timer, or the address sits in the address bar where
      // it can be copied or leaked. Holding it in pendingRid keeps it usable if
      // this particular view never gets reported.
      //
      // Checked on every navigation, not just the first page. In practice only
      // a dispatch link carries rid and that's always a fresh page load, but
      // tying the scrub to "first page of the visit" means any path where that
      // assumption breaks leaves the address sitting in the URL.
      pendingRid = takeReaderId() || pendingRid

      // Everything below is captured now but sent later; document.referrer is
      // gone after a client-side navigation.
      const source = isFirstOfVisit ? classifyArrival() : 'internal'
      const referrer = isFirstOfVisit ? (document.referrer || '').slice(0, 400) : ''

      const fire = () => {
        if (reported.current === pathname || document.hidden) return
        reported.current = pathname
        const rid = pendingRid
        pendingRid = ''
        send({ path: pathname, source, referrer, ...(rid ? { rid } : {}) })
      }
      const timer = window.setTimeout(fire, DWELL_MS)

      // Leaving early — closing the tab, backgrounding, or navigating on — means
      // the dwell was never served, so the view is dropped.
      const cancel = () => window.clearTimeout(timer)
      window.addEventListener('pagehide', cancel)

      return () => {
        window.clearTimeout(timer)
        window.removeEventListener('pagehide', cancel)
      }
    } catch {
      // analytics must never break the page
    }
  }, [pathname])

  return null
}
