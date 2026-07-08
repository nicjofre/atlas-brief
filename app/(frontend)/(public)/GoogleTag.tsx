import Script from 'next/script'

// Google tags (gtag.js) for David's marketing:
//   - Google Ads (AW-18292132689): conversion tracking + remarketing
//   - Google Analytics 4 (G-K7RPZMTWNB): site analytics
// gtag.js is loaded ONCE and each ID gets its own config() call — the library
// supports multiple destinations from a single load, so we don't embed the
// script twice. Loaded on the public site only (not the internal admin/editor),
// same as the LinkedIn Insight Tag.
const GOOGLE_ADS_ID = 'AW-18292132689'
const GA4_ID = 'G-K7RPZMTWNB'

export default function GoogleTag() {
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
