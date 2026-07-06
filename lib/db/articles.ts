import type { Tables } from './types'
import { createClient } from '@/lib/supabase/server'
import { resolveHeroUrl } from './hero-url'
import { getPublishedPosts } from '@/lib/getPost'
import type { Post } from '@/payload-types'

export type Takeaway = { bold: string; text: string }

export type ListingBrokerRow = Pick<Tables<'listing_brokers'>, 'role' | 'sort_order'> & {
  broker: Tables<'brokers'> | null
}

export type ArticleWithJoins = Tables<'articles'> & {
  listing: Tables<'listings'> & {
    property: Tables<'properties'> | null
    listing_broker: Tables<'brokers'> | null
    buyer_broker: Tables<'brokers'> | null
    listing_brokers: ListingBrokerRow[]
  }
}

export async function getArticleBySlug(slug: string): Promise<ArticleWithJoins | null> {
  const supabase = await createClient()
  const { data, error } = await supabase
    .from('articles')
    .select(
      `
      *,
      listing:listings (
        *,
        property:properties (*),
        listing_broker:brokers!listings_listing_broker_id_fkey (*),
        buyer_broker:brokers!listings_buyer_broker_id_fkey (*),
        listing_brokers (
          role, sort_order,
          broker:brokers (*)
        )
      )
    `
    )
    .eq('slug', slug)
    .eq('status', 'published')
    .is('deleted_at', null)
    .maybeSingle()

  if (error) {
    console.error('[getArticleBySlug] supabase error', error)
    return null
  }
  return data as ArticleWithJoins | null
}

// Card-shaped projection used by the feed, section, and homepage routes —
// just the fields needed to render a listing card. The heroUrl field is
// pre-resolved server-side so cards can <img src={...}> it directly without
// re-running URL normalization per card.
export type ArticleCard = Pick<
  Tables<'articles'>,
  | 'id'
  | 'slug'
  | 'section_slug'
  | 'cat_label'
  | 'entry_num'
  | 'tape_tier'
  | 'headline'
  | 'deck'
  | 'excerpt'
  | 'published_at'
> & {
  heroUrl: string | null
  // 'post' = a freeform Payload post bridged into the feed; undefined/'brief' =
  // a normal Tape brief. Cards branch on this to skip listing-only chrome
  // (status badge, entry number, place line).
  kind?: 'brief' | 'post'
  listing: {
    status: string | null
    property: {
      street_address: string | null
      city: string | null
      neighborhood: string | null
      year_built: number | null
      unit_count: number | null
    } | null
  } | null
}

// Map a published freeform post into the shared card shape so it renders in the
// same feeds as briefs. Posts have no listing; kind:'post' tells cards to drop
// listing-only chrome.
function postToCard(post: Post): ArticleCard {
  const hero = post.heroImage && typeof post.heroImage === 'object' ? (post.heroImage.url ?? null) : null
  return {
    id: `post_${post.id}`,
    slug: post.slug,
    section_slug: 'the-tape',
    cat_label: post.kicker ?? 'Dispatch',
    entry_num: 0,
    tape_tier: null,
    headline: post.title ?? '',
    deck: post.deck ?? null,
    excerpt: null,
    published_at: post.publishedAt ?? post.createdAt ?? null,
    heroUrl: hero,
    kind: 'post',
    listing: null,
  }
}

export async function getArticles(opts: { sectionSlug?: string } = {}): Promise<ArticleCard[]> {
  const supabase = await createClient()
  let q = supabase
    .from('articles')
    .select(
      `
      id, slug, section_slug, cat_label, entry_num, tape_tier,
      headline, deck, excerpt, published_at,
      hero_photo_url,
      listing:listings (
        status, hero_photo_url,
        property:properties (
          street_address, city, neighborhood, year_built, unit_count
        )
      )
    `
    )
    .eq('status', 'published')
    .is('deleted_at', null)
    .order('published_at', { ascending: false })

  if (opts.sectionSlug) q = q.eq('section_slug', opts.sectionSlug)

  const { data, error } = await q
  if (error) {
    console.error('[getArticles] supabase error', error)
    return []
  }

  // Project: prefer the article's hero override; fall back to the listing's;
  // resolve to a browser-loadable URL.
  const briefCards = (data ?? []).map(row => {
    const r = row as unknown as {
      id: string
      slug: string
      section_slug: string
      cat_label: string | null
      entry_num: number
      tape_tier: number | null
      headline: string | null
      deck: string | null
      excerpt: string | null
      published_at: string | null
      hero_photo_url: string | null
      listing: {
        status: string | null
        hero_photo_url: string | null
        property: ArticleCard['listing'] extends infer L ? L extends { property: infer P } ? P : never : never
      } | null
    }
    const raw = r.hero_photo_url ?? r.listing?.hero_photo_url ?? null
    return {
      id: r.id,
      slug: r.slug,
      section_slug: r.section_slug,
      cat_label: r.cat_label,
      entry_num: r.entry_num,
      tape_tier: r.tape_tier,
      // headline is non-null in the DB schema but the SELECT typing surfaces
      // string|null; coerce to empty string to match the ArticleCard contract.
      headline: r.headline ?? '',
      deck: r.deck,
      excerpt: r.excerpt,
      published_at: r.published_at,
      heroUrl: resolveHeroUrl(supabase, raw),
      listing: r.listing
        ? { status: r.listing.status, property: r.listing.property }
        : null,
    }
  })

  // Listing-section pages stay brief-only. The general feed (homepage,
  // /atlas-brief, dispatch) interleaves published freeform posts by date.
  if (opts.sectionSlug) return briefCards

  let postCards: ArticleCard[] = []
  try {
    const posts = await getPublishedPosts()
    postCards = posts.map(postToCard)
  } catch (e) {
    console.error('[getArticles] posts bridge failed', e)
  }

  return [...briefCards, ...postCards].sort((a, b) =>
    (b.published_at ?? '').localeCompare(a.published_at ?? '')
  )
}
