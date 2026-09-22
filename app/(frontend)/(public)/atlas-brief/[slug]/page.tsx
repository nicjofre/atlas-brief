// The canonical article route. It no longer renders an article itself — it
// decides which treatment the slug gets, emits the structured data, and mounts
// the reader-capture bar.
//
//   a brief (a listing-backed Tape entry) -> the Tape treatment
//   a post  (a freeform Payload dispatch) -> the Journal treatment
//
// That split is David's call, confirmed by Lucas on 2026-09-22: briefs and
// dispatches are different kinds of writing and had been sharing one layout.
//
// The old shared template that used to live here — crumb, kicker, byline,
// Deal Stats, broker cards, takeaways, author block, Back to Board — came out
// with the split. It isn't parked inline: at ~210 lines of JSX a commented copy
// would have doubled the file, and this folder's stylesheets already carry
// snapshots. To read it:
//     git show 2d26671:'app/(frontend)/(public)/atlas-brief/[slug]/page.tsx'
//
// FreeformPost.tsx is still in this folder and is now mounted by nothing. Left
// deliberately, the same way Comments.tsx was: unmounted, not deleted.

import { notFound } from 'next/navigation'
import { draftMode } from 'next/headers'
import type { Metadata } from 'next'
import { pageMetadata } from '@/lib/seo/metadata'
import { JsonLd, articleGraph, breadcrumbGraph } from '@/lib/seo/json-ld'
import { getArticleBySlug } from '@/lib/db/articles'
import { getPostBySlug } from '@/lib/getPost'
// The two treatments this route now renders. They're the same modules the
// /atlas-brief/tape-preview and /atlas-brief/wsj-preview routes serve — imported
// rather than copied, so the preview URLs keep showing exactly what ships and
// there's one implementation of each. Their own `metadata` exports (robots:
// noindex) belong to those routes and don't apply here; this route's
// generateMetadata is what search engines see.
import TapeArticle from '../tape-preview/[slug]/page'
import DispatchArticle from '../wsj-preview/[slug]/page'
import { resolveHeroUrl } from '@/lib/db/hero-url'
import { createClient } from '@/lib/supabase/server'
import ArticleSubscribeBar from '../../ArticleSubscribeBar'
import ArticleSubscribeModal from '../../ArticleSubscribeModal'
// Still imported although this route no longer renders its own markup:
// BrokerBlock lives in this folder, the Tape template imports it, and its
// styles are in here. Dropping this would strip the broker cards on every
// brief.
import './post.css'

export async function generateMetadata(
  { params }: { params: Promise<{ slug: string }> }
): Promise<Metadata> {
  const { slug } = await params
  // A slug is either a brief or a post, never both, so look in both stores at
  // once. Sequentially, a post paid for a wasted brief lookup before its own
  // query even started — slow enough on a cold render that Next streamed the
  // shell first and flushed the tags into the body instead of <head>.
  const { isEnabled: draft } = await draftMode()
  const [article, post] = await Promise.all([
    getArticleBySlug(slug),
    getPostBySlug(slug, draft).catch(() => null),
  ])

  if (!article) {
    if (!post) return { title: 'Atlas Brief' }
    const hero = post.heroImage && typeof post.heroImage === 'object' ? post.heroImage.url : undefined
    // Essays about a specific building get the same address-first treatment as
    // briefs, when David has filled the address in. Market essays don't.
    const postAddress = post.propertyAddress?.trim() || null
    const postLocality = post.propertyLocality?.trim() || null
    return pageMetadata({
      title: postAddress ? `${postAddress} — ${post.title}` : `${post.title} — Atlas Brief`,
      description: postAddress
        ? [`${postAddress}${postLocality ? `, ${postLocality}` : ''}.`, post.deck].filter(Boolean).join(' ')
        : (post.deck ?? undefined),
      path: `/atlas-brief/${slug}`,
      images: hero ? [hero] : undefined,
      type: 'article',
      publishedTime: post.publishedAt ?? undefined,
      modifiedTime: post.updatedAt ?? undefined,
      socialTitle: `${post.title} — Atlas Brief`,
    })
  }

  const plainHeadline = (article.headline ?? '').replace(/\*/g, '')
  const address = article.listing?.property?.street_address ?? null
  const locality = article.listing?.property?.city ?? null

  // Lead the search title with the street address. People look these buildings
  // up by address and nothing else, and not one headline in the archive
  // contains one — they name the block or the buyer, never the number.
  //
  // Address FIRST, not appended: Google truncates around 60 characters, and on
  // a typical headline an appended address falls past the cut and is never
  // seen. The "— Atlas Brief" suffix is dropped on these for the same reason;
  // those characters are worth more spent on the headline.
  const title = address
    ? `${address} — ${plainHeadline}`
    : `${plainHeadline} — Atlas Brief`

  // Same reasoning for the snippet: open with the address, then David's deck.
  const deck = article.deck ?? undefined
  const description = address
    ? [`${address}${locality ? `, ${locality}` : ''}.`, deck].filter(Boolean).join(' ')
    : deck

  // Share card uses the property's hero photo (overrides the sitewide banner).
  const supabase = await createClient()
  const heroUrl = resolveHeroUrl(
    supabase,
    article.hero_photo_url ?? article.listing?.hero_photo_url ?? null
  )

  return pageMetadata({
    title,
    description,
    path: `/atlas-brief/${slug}`,
    images: heroUrl ? [heroUrl] : undefined,
    type: 'article',
    publishedTime: article.published_at ?? undefined,
    modifiedTime: article.updated_at ?? undefined,
    // Social keeps the headline as written.
    socialTitle: `${plainHeadline} — Atlas Brief`,
  })
}

export default async function PostPage(
  { params }: { params: Promise<{ slug: string }> }
) {
  const { slug } = await params
  // One auth check up front: hide the reader capture bar from signed-in admins.
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  const showBar = !user

  const article = await getArticleBySlug(slug)
  if (!article) {
    // Not a brief, so it's a dispatch — a freeform Payload post. Check it
    // exists before handing off, so a bad slug still 404s here rather than
    // inside the template. In CMS draft mode this returns the in-progress
    // draft; DispatchArticle reads draftMode itself and fetches the same way,
    // and the lookup is React-cached, so this costs one query either way.
    const { isEnabled: draft } = await draftMode()
    const post = await getPostBySlug(slug, draft)
    if (!post) notFound()
    // The Journal treatment, per David: dispatches get this, briefs get the
    // Tape one below. FreeformPost is no longer mounted anywhere — see the
    // note at the top of this file.
    return <DispatchArticle params={params} />
  }

  // Everything below feeds the structured data only. The page itself is the
  // template's; the broker roster, the TOC, the body-stripping and the
  // takeaways all moved there with it.
  const listing = article.listing
  const property = listing?.property

  const sectionLabel =
    article.section_slug === 'broker-activity' ? 'Broker Activity' : article.section_slug
  // Section name for the structured data. The visible kicker doesn't print it —
  // the breadcrumb directly above already does — but main's JSON-LD names the
  // section for search and answer engines.
  const catLabel = article.cat_label ?? sectionLabel

  // Hero photo for og:image and the NewsArticle node — handles local paths,
  // full URLs and Supabase storage paths uniformly.
  const heroUrl = resolveHeroUrl(
    supabase,
    article.hero_photo_url ?? listing?.hero_photo_url ?? null
  )

  return (
    <>
      {/* NewsArticle for this brief. `about` carries the street address, which
          is the whole point: it's what lets a search or an LLM resolve "what
          happened at 630 Masselin" to this page. The template below emits no
          structured data, so it stays here on the canonical route — the
          preview routes are noindexed and never needed it. */}
      <JsonLd
        data={articleGraph({
          headline: (article.headline ?? '').replace(/\*/g, ''),
          description: article.deck,
          path: `/atlas-brief/${slug}`,
          datePublished: article.published_at,
          dateModified: article.updated_at,
          images: [heroUrl],
          section: catLabel,
          address: property
            ? {
                streetAddress: property.street_address,
                locality: property.city,
                region: property.state,
              }
            : null,
        })}
      />
      <JsonLd
        data={breadcrumbGraph([
          { name: 'Atlas Brief', path: '/' },
          // The Tape is the section page. This used to point at /atlas-brief,
          // which is the orphaned feed index, not the stream's home.
          { name: 'The Tape', path: '/atlas-brief/sections/broker-activity' },
          { name: catLabel, path: `/atlas-brief/sections/${article.section_slug}` },
        ])}
      />

      {/* The reader-capture bar and the scroll-triggered pop-up. The template
          mounts its own modal with the trigger OFF (it only answers the nav's
          Subscribe button), so this instance is what actually fires on scroll.
          Two mount; each renders null until opened, and the first to mount
          claims the nav event — so they can't both open. */}
      {showBar && <ArticleSubscribeBar slug={slug} />}
      <ArticleSubscribeModal enabled={showBar} slug={slug} />

      {/* The Tape treatment, per David and Lucas: briefs get this, dispatches
          get the Journal one. It fetches the brief by slug itself; that query
          is React-cached, so this page view still hits the database once. */}
      <TapeArticle params={params} />
    </>
  )
}






