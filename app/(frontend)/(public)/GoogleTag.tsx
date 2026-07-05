import Script from 'next/script'

// Google Ads tag (gtag.js) for David's ad account, AW-18292132689 — conversion
// tracking + remarketing for his Google Ads campaigns. Loaded on the public
// site only (not the internal admin/editor), same as the LinkedIn Insight Tag.
const GOOGLE_TAG_ID = 'AW-18292132689'

export default function GoogleTag() {
  return (
    <>
      <Script
        src={`https://www.googletagmanager.com/gtag/js?id=${GOOGLE_TAG_ID}`}
        strategy="afterInteractive"
      />
      <Script id="google-gtag" strategy="afterInteractive">
        {`window.dataLayer = window.dataLayer || [];
function gtag(){dataLayer.push(arguments);}
gtag('js', new Date());
gtag('config', '${GOOGLE_TAG_ID}');`}
      </Script>
    </>
  )
}
