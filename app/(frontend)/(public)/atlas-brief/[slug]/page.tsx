import Link from 'next/link'
import { notFound } from 'next/navigation'
import { draftMode } from 'next/headers'
import type { Metadata } from 'next'
import { getArticleBySlug, type ArticleWithJoins } from '@/lib/db/articles'
import { getPostBySlug } from '@/lib/getPost'
import FreeformPost from './FreeformPost'
import { HeadlineText, extractTOCFromHtml, stripBrokersBlock } from '@/lib/db/article-render'
import { resolveHeroUrl } from '@/lib/db/hero-url'
import { createClient } from '@/lib/supabase/server'
import type { SupabaseClient } from '@supabase/supabase-js'
import type { Database, Tables } from '@/lib/db/types'
import BrokerBlock, { type BrokerCard, type BrokerGroup } from './BrokerBlock'
import Disclaimer from '../../Disclaimer'
import TrackView from './TrackView'
import ArticleSubscribeBar from '../../ArticleSubscribeBar'
import './post.css'

type Takeaway = { bold: string; text: string }

export async function generateMetadata(
  { params }: { params: Promise<{ slug: string }> }
): Promise<Metadata> {
  const { slug } = await params
  const article = await getArticleBySlug(slug)
  if (!article) {
    // Not a brief — maybe a freeform post.
    const { isEnabled: draft } = await draftMode()
    const post = await getPostBySlug(slug, draft)
    if (!post) return { title: 'Atlas Brief' }
    const title = `${post.title} — Atlas Brief`
    const description = post.deck ?? undefined
    const hero = post.heroImage && typeof post.heroImage === 'object' ? post.heroImage.url : undefined
    const images = hero ? [hero] : undefined
    return {
      title,
      description,
      openGraph: { type: 'article', title, description, url: `/atlas-brief/${slug}`, images },
      twitter: { card: 'summary_large_image', title, description, images },
    }
  }
  const plainHeadline = (article.headline ?? '').replace(/\*/g, '')
  const title = `${plainHeadline} — Atlas Brief`
  const description = article.deck ?? undefined

  // Share card uses the property's hero photo (overrides the sitewide banner).
  const supabase = await createClient()
  const heroUrl = resolveHeroUrl(
    supabase,
    article.hero_photo_url ?? article.listing?.hero_photo_url ?? null
  )
  const images = heroUrl ? [heroUrl] : undefined

  return {
    title,
    description,
    openGraph: {
      type: 'article',
      title,
      description,
      url: `/atlas-brief/${slug}`,
      images,
    },
    twitter: {
      card: 'summary_large_image',
      title,
      description,
      images,
    },
  }
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
    // Not a brief — try a freeform post before 404ing. In CMS draft mode, show
    // the in-progress draft (for Live Preview).
    const { isEnabled: draft } = await draftMode()
    const post = await getPostBySlug(slug, draft)
    if (post) return <FreeformPost post={post} preview={draft} showBar={showBar && !draft} />
    notFound()
  }

  const listing = article.listing
  const property = listing?.property
  const takeaways = (article.takeaways as Takeaway[] | null) ?? []

  const sectionLabel =
    article.section_slug === 'broker-activity' ? 'Broker Activity' : article.section_slug
  // Per-article override for the eyebrow line; falls back to the section name
  // when an article doesn't override.
  const catLabel = article.cat_label ?? sectionLabel

  const dateline = [property?.city, property?.state].filter(Boolean).join(', ')

  // Resolve hero photo — handles local paths, full URLs, and Supabase storage
  // paths uniformly. (supabase client created up top.)
  const heroUrl = resolveHeroUrl(
    supabase,
    article.hero_photo_url ?? listing?.hero_photo_url ?? null
  )

  // Broker roster, live from the listing_brokers join table (no longer baked
  // into body_html). Grouped + labeled so teams and dual-agency render
  // faithfully. Falls back to the FK columns for any listing not yet backfilled.
  const brokerGroups = buildBrokerGroups(listing, supabase)

  // Strip the legacy broker content from the body ONLY when the card has brokers
  // to show in its place. If the card would be empty (a listing with no broker
  // records yet), keep the body section so the broker isn't lost — it just shows
  // in the old form until its data is transferred. Build the TOC from whatever
  // body we actually render, so it never links a removed section.
  const cleanBody = brokerGroups.length > 0 ? stripBrokersBlock(article.body_html) : (article.body_html ?? '')
  const toc = extractTOCFromHtml(cleanBody)
  // Whether the body has anything worth rendering — visible text, or structural
  // / media content. Empty briefs skip the body section so it doesn't leave a
  // big blank gap above the footer.
  const hasBody =
    /\S/.test(cleanBody.replace(/<[^>]+>/g, '').replace(/&nbsp;/gi, ' ')) ||
    /<(img|table|figure|blockquote|ul|ol|iframe)\b/i.test(cleanBody)

  return (
    <>
      {showBar && <ArticleSubscribeBar />}
      <TrackView slug={article.slug} />
      <header className="art-top">
        <div className="wrap">
          <nav className="crumb">
            <Link href="/">
              Atlas <span style={{ color: 'var(--accent)' }}>Home Pro</span>
            </Link>
            <span className="sep">/</span>
            <Link href="/atlas-brief">Atlas Brief</Link>
            <span className="sep">/</span>
            <Link href={`/atlas-brief/sections/${article.section_slug}`}>{sectionLabel}</Link>
            <span className="sep">/</span>
            <span>Entry № {String(article.entry_num).padStart(2, '0')}</span>
          </nav>
          <div className="cat">
            <span className={`badge-${badgeClass(listing?.status)}`}>{badgeLabel(listing?.status)}</span>
            <span>
              {catLabel} · Entry № {String(article.entry_num).padStart(2, '0')}
            </span>
          </div>
          <h1>
            <HeadlineText text={article.headline} />
          </h1>
          {article.deck && <p className="deck">{article.deck}</p>}
          {article.byline_html ? (
            <div className="byl" dangerouslySetInnerHTML={{ __html: article.byline_html }} />
          ) : (
            <div className="byl">
              <div><b>David Safai</b>Editor · Publisher</div>
              <div><b>Published</b>{formatDate(article.published_at)}</div>
              {article.status_tag && <div><b>Status</b>{article.status_tag}</div>}
              {dateline && <div><b>Dateline</b>{dateline}</div>}
            </div>
          )}
        </div>
      </header>

      {heroUrl && (
        <section className="art-lead">
          <div className="wrap">
            <figure className="lead-photo">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={heroUrl}
                alt={`${property?.street_address ?? 'Listing'} hero photo`}
                width={1600}
                height={1067}
              />
              {article.hero_caption && (
                <figcaption className="cap">{renderHeroCaption(article.hero_caption)}</figcaption>
              )}
            </figure>
          </div>
        </section>
      )}

      {takeaways.length > 0 && (
        <section className="key-takeaways">
          <div className="wrap">
            <div className="kt-card">
              <div className="kt-head">
                {wordForCount(takeaways.length)} takeaways
                {article.takeaways_subhead && <b>{article.takeaways_subhead}</b>}
              </div>
              <ol className="kt-list">
                {takeaways.map((t, i) => (
                  <li key={i}>
                    <b>{t.bold}</b>{t.text}
                  </li>
                ))}
              </ol>
            </div>
          </div>
        </section>
      )}

      {article.deal_stats_html && (
        <section className="deal-stats">
          <div className="wrap">
            <div className="stats-head">
              Deal Stats · {property?.street_address ?? '—'}
            </div>
            <div
              className="stats-grid"
              dangerouslySetInnerHTML={{ __html: article.deal_stats_html }}
            />
          </div>
        </section>
      )}

      {hasBody && (
        <section className="art-body">
          <div className="wrap">
            <div className="body-grid">
              {toc.length > 0 && (
                <aside>
                  <div className="k">In this piece</div>
                  <ol>
                    {toc.map(item => (
                      <li key={item.id}>
                        <a href={`#${item.id}`}>{item.text}</a>
                      </li>
                    ))}
                  </ol>
                </aside>
              )}

              <article
                className="prose"
                dangerouslySetInnerHTML={{ __html: cleanBody }}
              />
            </div>
          </div>
        </section>
      )}

      {brokerGroups.length > 0 && <BrokerBlock groups={brokerGroups} />}

      <section className="author">
        <div className="wrap">
          <div className="author-in">
            <div>
              <div className="k">Written from the field</div>
              <h3>David Safai, operator, developer, GC.</h3>
              <p>
                Atlas Home Builders, Inc. is a Los Angeles owner-operator and general contractor. If you are
                a broker with a listing you want an honest read on, send the OM and the T-12 to{' '}
                <a
                  href="mailto:David@AtlasBrief.La"
                  style={{ borderBottom: '1px solid var(--accent)', color: 'var(--ink)' }}
                >
                  David@AtlasBrief.La
                </a>
                .
              </p>
            </div>
            <div className="btns">
              <a href="mailto:David@AtlasBrief.La">Send a Listing</a>
              <Link href={`/atlas-brief/sections/${article.section_slug}`}>Back to Board</Link>
            </div>
          </div>
        </div>
      </section>

      <footer className="site-footer">
        <div className="wrap">
          <div>
            &copy; 2026 <Link href="/atlas-brief">Atlas Brief</Link> &middot; A publication of Atlas Home Builders, Inc.
          </div>
          <div>
            Entry № {String(article.entry_num).padStart(2, '0')} &middot; {sectionLabel} &middot;{' '}
            {formatDate(article.published_at)}
          </div>
          <div>
            Los Angeles &middot;{' '}
            <a href="mailto:David@AtlasBrief.La">David@AtlasBrief.La</a>
          </div>
          <div style={{ flexBasis: '100%', paddingTop: 16, marginTop: 4, borderTop: '1px solid var(--rule, rgba(0,0,0,0.08))' }}>
            <Disclaimer />
          </div>
        </div>
      </footer>
    </>
  )
}

function toBrokerCard(
  b: Tables<'brokers'>,
  supabase: SupabaseClient<Database>
): BrokerCard {
  return {
    name: b.name,
    title: b.title,
    firm: b.firm,
    phone: b.phone ?? b.cell,
    email: b.email,
    dre: b.dre_license,
    headshotUrl: resolveHeroUrl(supabase, b.headshot_url),
    logoUrl: resolveHeroUrl(supabase, b.firm_logo_url),
  }
}

// Build the labeled broker groups for the article card from the listing's
// roster. Dual agency (a broker on both sides) collapses into a single
// "Buyer & Listing Broker" group so the same person isn't shown twice.
function buildBrokerGroups(
  listing: ArticleWithJoins['listing'] | null | undefined,
  supabase: SupabaseClient<Database>
): BrokerGroup[] {
  // Prefer the join table; fall back to the FK columns for listings not yet
  // backfilled (and so new parses that only set the FKs still render).
  let rows = (listing?.listing_brokers ?? [])
    .filter(r => r.broker)
    .map(r => ({ role: r.role, order: r.sort_order, broker: r.broker as Tables<'brokers'> }))

  if (rows.length === 0 && listing) {
    if (listing.listing_broker) rows.push({ role: 'listing', order: 0, broker: listing.listing_broker })
    if (listing.buyer_broker) rows.push({ role: 'buyer', order: 0, broker: listing.buyer_broker })
  }

  // Roles per broker → detect dual agency (both sides).
  const roleSets = new Map<string, Set<string>>()
  for (const r of rows) {
    if (!roleSets.has(r.broker.id)) roleSets.set(r.broker.id, new Set())
    roleSets.get(r.broker.id)!.add(r.role)
  }

  const seen = new Set<string>()
  const dual: typeof rows = []
  const listingOnly: typeof rows = []
  const buyerOnly: typeof rows = []
  for (const r of rows) {
    const roles = roleSets.get(r.broker.id)!
    const isDual = roles.has('listing') && roles.has('buyer')
    if (isDual) {
      if (seen.has(r.broker.id)) continue // one card for a dual-agency broker
      seen.add(r.broker.id)
      dual.push(r)
    } else if (r.role === 'listing') listingOnly.push(r)
    else buyerOnly.push(r)
  }

  const sortAndMap = (list: typeof rows) =>
    list
      .sort((a, b) => a.order - b.order)
      .map(r => toBrokerCard(r.broker, supabase))
      .filter(b => b.name || b.firm)

  const label = (base: string, n: number) => (n > 1 ? `${base}s` : base)

  const groups: BrokerGroup[] = []
  if (dual.length) groups.push({ key: 'dual', label: label('Buyer & Listing Broker', dual.length), brokers: sortAndMap(dual) })
  if (listingOnly.length) groups.push({ key: 'listing', label: label('Listing Broker', listingOnly.length), brokers: sortAndMap(listingOnly) })
  if (buyerOnly.length) groups.push({ key: 'buyer', label: label('Buyer Broker', buyerOnly.length), brokers: sortAndMap(buyerOnly) })
  return groups.filter(g => g.brokers.length > 0)
}

function badgeClass(status: string | null | undefined): string {
  if (status === 'sold') return 'sold'
  if (status === 'for_sale') return 'forsale'
  return 'forsale'
}

function badgeLabel(status: string | null | undefined): string {
  if (status === 'sold') return 'Sold'
  if (status === 'for_sale') return 'For Sale'
  if (status === 'under_construction') return 'Under Construction'
  return 'Off Market'
}

function formatDate(s: string | null | undefined): string {
  if (!s) return '—'
  const d = new Date(s)
  if (isNaN(d.getTime())) return s
  return d.toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' })
}

function wordForCount(n: number): string {
  const words = ['Zero', 'One', 'Two', 'Three', 'Four', 'Five', 'Six', 'Seven', 'Eight', 'Nine']
  return words[n] ?? String(n)
}

function renderHeroCaption(caption: string) {
  // The hero is always the lead figure, so its label is "FIG. 01". The draft AI
  // frequently emits a placeholder "FIG. 00" (and a few get "FIG. 01"); normalize
  // any leading figure label so the caption never reads "FIG. 00".
  const m = caption.match(/^FIG\.?\s*\d+\s*,?\s*(.*)$/i)
  if (!m) return caption
  return (
    <>
      <b>FIG. 01</b>, {m[1]}
    </>
  )
}
