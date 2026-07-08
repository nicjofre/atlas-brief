'use client'

import Script from 'next/script'
import { useEffect, useState } from 'react'

// Google tags (gtag.js): Google Ads (AW-18292132689) + GA4 (G-K7RPZMTWNB).
// gtag.js loads once; each ID gets its own config(). Public pages only, and —
// importantly — ONLY on the production host. Vercel preview deploys and
// localhost must not fire the tags, or they pollute Ads/Analytics with
// non-visitor traffic and show up as stray domains in Google's tag coverage.
const GOOGLE_ADS_ID = 'AW-18292132689'
const GA4_ID = 'G-K7RPZMTWNB'
const PROD_HOSTS = new Set(['atlasbrief.la', 'www.atlasbrief.la'])

export default function GoogleTag() {
  const [enabled, setEnabled] = useState(false)
  useEffect(() => {
    if (PROD_HOSTS.has(window.location.hostname)) setEnabled(true)
  }, [])

  if (!enabled) return null
  return (
    <>
      <Script
        src={`https://www.googletagmanager.com/gtag/js?id=${GOOGLE_ADS_ID}`}
        strategy="afterInteractive"
      />
      <Script id="google-gtag" strategy="afterInteractive">
        {`window.dataLayer = window.dataLayer || [];
function gtag(){dataLayer.push(arguments);}
gtag('js', new Date());
gtag('config', '${GOOGLE_ADS_ID}');
gtag('config', '${GA4_ID}');`}
      </Script>
    </>
  )
}
