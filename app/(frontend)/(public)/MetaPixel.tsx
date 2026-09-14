'use client'

import Script from 'next/script'
import { useEffect, useState } from 'react'
import { META_PIXEL_ID } from '@/lib/analytics/conversions'

// Meta (Facebook) pixel. Same shape as GoogleTag and LinkedInInsight: public
// pages only, and ONLY on the production host, so preview deploys and localhost
// never land in Events Manager.
//
// The base snippet fires PageView on load. Newsletter signups fire a Lead event
// from trackNewsletterSignup(), alongside the Google Ads conversion and the GA4
// event, so the three can't drift apart — which is exactly how the subscribe bar
// managed to record nothing for months.
const PROD_HOSTS = new Set(['atlasbrief.la', 'www.atlasbrief.la'])

export default function MetaPixel() {
  const [enabled, setEnabled] = useState(false)
  useEffect(() => {
    if (PROD_HOSTS.has(window.location.hostname)) setEnabled(true)
  }, [])

  if (!enabled) return null
  return (
    <>
      <Script id="meta-pixel" strategy="afterInteractive">
        {`!function(f,b,e,v,n,t,s)
{if(f.fbq)return;n=f.fbq=function(){n.callMethod?
n.callMethod.apply(n,arguments):n.queue.push(arguments)};
if(!f._fbq)f._fbq=n;n.push=n;n.loaded=!0;n.version='2.0';
n.queue=[];t=b.createElement(e);t.async=!0;
t.src=v;s=b.getElementsByTagName(e)[0];
s.parentNode.insertBefore(t,s)}(window,document,'script',
'https://connect.facebook.net/en_US/fbevents.js');
fbq('init', '${META_PIXEL_ID}');
fbq('track', 'PageView');`}
      </Script>
      {/* Fallback for readers with JavaScript disabled. */}
      <noscript>
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          height="1"
          width="1"
          style={{ display: 'none' }}
          alt=""
          src={`https://www.facebook.com/tr?id=${META_PIXEL_ID}&ev=PageView&noscript=1`}
        />
      </noscript>
    </>
  )
}
