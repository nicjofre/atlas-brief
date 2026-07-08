'use client'

import Script from 'next/script'
import { useEffect, useState } from 'react'

// LinkedIn Insight Tag (David's ad account, partner id 9605532) — advertising /
// retargeting pixel. Public pages only, and ONLY on the production host so
// Vercel previews + localhost don't fire it and skew the ad data.
const LINKEDIN_PARTNER_ID = '9605532'
const PROD_HOSTS = new Set(['atlasbrief.la', 'www.atlasbrief.la'])

export default function LinkedInInsight() {
  const [enabled, setEnabled] = useState(false)
  useEffect(() => {
    if (PROD_HOSTS.has(window.location.hostname)) setEnabled(true)
  }, [])

  if (!enabled) return null
  return (
    <Script id="linkedin-insight" strategy="afterInteractive">
      {`_linkedin_partner_id = "${LINKEDIN_PARTNER_ID}";
window._linkedin_data_partner_ids = window._linkedin_data_partner_ids || [];
window._linkedin_data_partner_ids.push(_linkedin_partner_id);
(function(l) {
if (!l){window.lintrk = function(a,b){window.lintrk.q.push([a,b])};
window.lintrk.q=[]}
var s = document.getElementsByTagName("script")[0];
var b = document.createElement("script");
b.type = "text/javascript";b.async = true;
b.src = "https://snap.licdn.com/li.lms-analytics/insight.min.js";
s.parentNode.insertBefore(b, s);})(window.lintrk);`}
    </Script>
  )
}
