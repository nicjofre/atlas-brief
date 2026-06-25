'use client'

import { useEffect } from 'react'

// Fires one reader-analytics beacon per article load. Runs after mount so it
// never blocks render; uses sendBeacon so it survives the user navigating away.
// Attributes the visit to a source: dispatch links carry ?ref=dispatch (email),
// otherwise we read document.referrer (social / other), else direct.
const SOCIAL_RE = /linkedin|lnkd|x\.com|twitter|t\.co|facebook|fb\.|instagram|reddit/i

export default function TrackView({ slug }: { slug: string }) {
  useEffect(() => {
    try {
      const params = new URLSearchParams(window.location.search)
      const ref = (params.get('ref') || params.get('utm_source') || '').toLowerCase()
      const referrer = document.referrer || ''

      let source = 'direct'
      if (ref === 'dispatch' || ref === 'email') {
        source = 'email'
      } else if (referrer) {
        let host = ''
        try {
          host = new URL(referrer).hostname
        } catch {}
        if (host && !host.includes(window.location.hostname)) {
          source = SOCIAL_RE.test(host) ? 'social' : 'other'
        }
      }

      const payload = JSON.stringify({ slug, source, referrer: referrer.slice(0, 400) })
      const url = '/api/track/view'
      if (navigator.sendBeacon) {
        navigator.sendBeacon(url, new Blob([payload], { type: 'application/json' }))
      } else {
        void fetch(url, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: payload,
          keepalive: true,
        })
      }
    } catch {
      // analytics must never break the page
    }
  }, [slug])

  return null
}
