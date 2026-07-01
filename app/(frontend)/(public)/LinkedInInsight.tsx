import Script from 'next/script'

// LinkedIn Insight Tag (David's ad account, partner id 9605532). Standard
// LinkedIn advertising/retargeting pixel — the LinkedIn equivalent of the Meta
// Pixel. Loaded on the public site only (not the internal admin/editor), so ad
// audiences and conversions reflect real visitors, not David's own sessions.
//
// The partner id must be set before the loader runs, so both steps live in a
// single inline script to guarantee order. next/script injects it after
// hydration (afterInteractive). The <noscript> pixel covers JS-disabled clients.
const LINKEDIN_PARTNER_ID = '9605532'

export default function LinkedInInsight() {
  return (
    <>
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
      <noscript>
        <img
          height="1"
          width="1"
          style={{ display: 'none' }}
          alt=""
          src={`https://px.ads.linkedin.com/collect/?pid=${LINKEDIN_PARTNER_ID}&fmt=gif`}
        />
      </noscript>
    </>
  )
}
