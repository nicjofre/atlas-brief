import type { Metadata } from 'next'
import SiteNav from './SiteNav'
import ArticleSubscribeModal from './ArticleSubscribeModal'
import LinkedInInsight from './LinkedInInsight'
import GoogleTag from './GoogleTag'
import MetaPixel from './MetaPixel'
import TrackPageView from './TrackPageView'
import { JsonLd, siteGraph } from '@/lib/seo/json-ld'
import './atlas-v2.css'

const OG_TITLE = 'Atlas Brief — A Journal of Record on LA Real Estate'
const OG_DESCRIPTION =
  'Every significant multifamily sale, land deal, and development move in Los Angeles. Tracked and explained by David Safai, 30-year operator.'

// Sitewide social-share defaults. The og:image is supplied by the generated
// opengraph-image.tsx in this segment; article pages override title/description/
// image with their own headline, deck, and hero photo. metadataBase (set in the
// (frontend) root layout) makes relative URLs resolve to atlasbrief.la.
export const metadata: Metadata = {
  title: 'Atlas Brief',
  description: 'An owner-builder journal of Los Angeles real estate, development, and policy.',
  // The roundel (AtlasMark), rendered from the brand font — app/favicon.ico
  // carries 16/32/48 for anything that asks for /favicon.ico directly. The old
  // favicon.svg (brown "A" on paper) came out 2026-09-28: SVG icons can't load
  // Newsreader, so a vector copy would draw the A in whatever serif the browser has.
  // ?v=2 is a cache-bust: phones and link-preview crawlers key the icon by URL
  // and would otherwise keep the old A. Bump it next time the mark changes.
  icons: {
    icon: [
      { url: '/favicon-32.png?v=2', sizes: '32x32', type: 'image/png' },
    ],
    apple: '/apple-touch-icon.png?v=2',
  },
  openGraph: {
    type: 'website',
    siteName: 'Atlas Brief',
    title: OG_TITLE,
    description: OG_DESCRIPTION,
    url: '/',
  },
  twitter: {
    card: 'summary_large_image',
    title: OG_TITLE,
    description: OG_DESCRIPTION,
  },
}

// No web fonts since 2026-10-07: the site is set in Times and Helvetica, which
// every device already has, so there is nothing to load.

export default function PublicLayout({ children }: { children: React.ReactNode }) {
  return (
    <>

      {/* Publisher / author / site identity, once per page. Article pages add
          their own NewsArticle node that points back at these by @id. */}
      <JsonLd data={siteGraph()} />

      <SiteNav />

      {/* The signup pop-up, for the Subscribe buttons inside articles (the
          nav's own button links to /subscribe since 2026-09-29). enabled={false}
          keeps its scroll trigger off — pages that want the automatic pop-up
          mount their own copy with it on. */}
      <ArticleSubscribeModal enabled={false} />

      <div id="atlas-ticker" />

      {children}

      <TrackPageView />
      <LinkedInInsight />
      <GoogleTag />
      <MetaPixel />
    </>
  )
}
