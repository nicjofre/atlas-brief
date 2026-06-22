import { render } from '@react-email/render'
import { createClient } from '@/lib/supabase/server'
import { getArticleBySlug } from '@/lib/db/articles'
import { resolveHeroUrl } from '@/lib/db/hero-url'
import { DispatchEmail, type DispatchEmailProps } from '@/lib/email/dispatch-template'
import { buildDispatchProps, siteBaseUrl } from '@/lib/email/build-dispatch'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

// Live preview of the Friday dispatch email. Hit /api/dispatch/preview?slug=<slug>
// to render a real published article as the email; with no slug it renders
// representative sample data so the formatting can be eyeballed before any
// Resend/send wiring exists. This is the design-backwards artifact: the email's
// shape drives what the send flow and CRM need.

const SAMPLE: DispatchEmailProps = {
  kicker: 'Broker Activity · For Sale',
  dateline: 'Friday, June 21, 2026',
  headline: '5712 Camellia, NoHo: 14 Doors at *$306K a Unit.*',
  deck: 'Soft-story retrofit is done and the rents are a notch under market, which is the whole pitch here. At a 4.86 broker CAP you are paying for the story, not the in-place cash flow. The question is whether the submarket gives you the bump.',
  heroUrl: null,
  stats: [
    { k: 'List Price', v: '$4,295,000', s: 'asking' },
    { k: 'Units', v: '14', s: '4 × 1+1 · 10 × 2+2' },
    { k: 'Price / Unit', v: '$306,786', s: 'per door' },
    { k: 'CAP', v: '4.86%', s: 'broker stated' },
  ],
  brokerTag: 'Listed by Jane Doe · Marcus & Millichap',
  articleUrl: `${siteBaseUrl()}/atlas-brief/5712-camellia-noho`,
  unsubscribeUrl: '#',
}

export async function GET(req: Request) {
  const slug = new URL(req.url).searchParams.get('slug')

  let props = SAMPLE
  if (slug) {
    const article = await getArticleBySlug(slug)
    if (!article) {
      return new Response(`No published article found for slug "${slug}".`, {
        status: 404,
        headers: { 'Content-Type': 'text/plain' },
      })
    }
    const supabase = await createClient()
    let heroUrl = resolveHeroUrl(
      supabase,
      article.hero_photo_url ?? article.listing?.hero_photo_url ?? null
    )
    // Email images need absolute URLs; local /public paths must be absolutized.
    if (heroUrl && heroUrl.startsWith('/')) heroUrl = siteBaseUrl() + heroUrl
    props = buildDispatchProps(article, { heroUrl })
  }

  const html = await render(<DispatchEmail {...props} />, { pretty: false })
  return new Response(html, {
    status: 200,
    headers: { 'Content-Type': 'text/html; charset=utf-8' },
  })
}
