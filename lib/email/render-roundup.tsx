import { render } from '@react-email/render'
import { createClient } from '@/lib/supabase/server'
import { getArticleBySlug } from '@/lib/db/articles'
import { getPostBySlug } from '@/lib/getPost'
import { resolveHeroUrl } from '@/lib/db/hero-url'
import { siteBaseUrl } from './build-dispatch'
import { buildRoundupDeal, buildRoundupDealFromPost } from './build-roundup'
import { RoundupEmail } from './roundup-template'

// Single source of truth for the roundup HTML — preview, test, and the live
// broadcast all render through here so they're byte-identical. The greeting and
// unsubscribeUrl are passed in: a sample for preview/test, the live Resend
// tokens for a broadcast.
export async function renderRoundupHtml(args: {
  slugs: string[]
  intro: string
  greeting: string
  unsubscribeUrl: string
  dateline: string
}): Promise<{ html: string; count: number; missing: string[] }> {
  const supabase = await createClient()
  const deals = []
  const missing: string[] = []
  for (const slug of args.slugs) {
    const article = await getArticleBySlug(slug)
    if (article) {
      let heroUrl = resolveHeroUrl(
        supabase,
        article.hero_photo_url ?? article.listing?.hero_photo_url ?? null
      )
      if (heroUrl && heroUrl.startsWith('/')) heroUrl = siteBaseUrl() + heroUrl
      deals.push(buildRoundupDeal(article, { heroUrl }))
      continue
    }
    // Not a brief — try a freeform post.
    const post = await getPostBySlug(slug)
    if (post) {
      const raw = post.heroImage && typeof post.heroImage === 'object' ? (post.heroImage.url ?? null) : null
      const heroUrl = raw && raw.startsWith('/') ? siteBaseUrl() + raw : raw
      deals.push(buildRoundupDealFromPost(post, { heroUrl }))
      continue
    }
    missing.push(slug)
  }
  const html = await render(
    <RoundupEmail
      dateline={args.dateline}
      greeting={args.greeting}
      intro={args.intro}
      deals={deals}
      unsubscribeUrl={args.unsubscribeUrl}
    />,
    { pretty: false }
  )
  return { html, count: deals.length, missing }
}
