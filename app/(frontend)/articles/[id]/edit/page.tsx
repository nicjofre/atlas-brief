import Link from 'next/link'
import { redirect, notFound } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import ArticleEditor, { type AIDraftShape } from './ArticleEditor'
import ReactionPanel, { type ListingFacts } from './ReactionPanel'
import InternalNav from '@/app/InternalNav'
import StatusEditor from '@/app/(frontend)/listings/[id]/StatusEditor'

export const dynamic = 'force-dynamic'

export default async function ArticleEditPage(
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const { data: article, error } = await supabase
    .from('articles')
    .select(`
      *,
      listing:listings (
        id, status, list_price, sale_price, sale_date, list_date,
        price_per_unit, cap_rate_current, cap_rate_market, grm_current,
        hero_photo_url,
        property:properties (street_address, city, state, zip, year_built, unit_count, gross_sf),
        listing_broker:brokers!listings_listing_broker_id_fkey (name, firm, phone, email)
      )
    `)
    .eq('id', id)
    .maybeSingle()

  if (error) {
    return (
      <PageShell>
        <div style={{ maxWidth: 600, margin: '40px auto', padding: 24, background: '#fee', border: '1px solid #fcc', borderRadius: 4, color: '#c0392b', fontSize: 13 }}>
          Error: {error.message}
        </div>
      </PageShell>
    )
  }
  if (!article) notFound()

  return (
    <PageShell>
      {/* Load David's editorial fonts so the editor preview matches the published post. */}
      <link rel="preconnect" href="https://fonts.googleapis.com" />
      <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="" />
      <link
        rel="stylesheet"
        href="https://fonts.googleapis.com/css2?family=Newsreader:ital,opsz,wght@0,6..72,300;0,6..72,400;0,6..72,500;1,6..72,400;1,6..72,500&display=swap"
      />
      <div style={{ maxWidth: 1180, margin: '0 auto', padding: '24px 24px 80px' }}>
        <div style={{ display: 'flex', alignItems: 'baseline', justifyContent: 'space-between', marginBottom: 8, flexWrap: 'wrap', gap: 16 }}>
          <div>
            <div style={{ fontSize: 11, letterSpacing: 2, textTransform: 'uppercase', color: '#9A6B3F', marginBottom: 6 }}>
              Article draft · {article.status}
            </div>
            <h1 style={{ fontFamily: 'Georgia, serif', fontSize: 26, color: '#111', margin: 0 }}>
              {article.listing?.property?.street_address ?? 'Untitled listing'}
            </h1>
            <div style={{ fontSize: 13, color: '#666', marginTop: 4 }}>
              {[article.listing?.property?.city, article.listing?.property?.state].filter(Boolean).join(', ')}
              {' · '}Entry № {String(article.entry_num).padStart(2, '0')} in {article.section_slug}
            </div>
            {article.listing_id && (
              <div style={{ marginTop: 10, display: 'flex', alignItems: 'center', gap: 8 }}>
                <span style={{ fontSize: 11, letterSpacing: 1.5, textTransform: 'uppercase', color: '#9A6B3F' }}>
                  Badge
                </span>
                <StatusEditor
                  listingId={article.listing_id as string}
                  currentStatus={article.listing?.status ?? null}
                />
              </div>
            )}
          </div>
          <div style={{ display: 'flex', gap: 10 }}>
            <Link
              href={`/listings/${article.listing_id}`}
              style={{ fontSize: 11, letterSpacing: 2, textTransform: 'uppercase', color: '#666', textDecoration: 'none' }}
            >
              ← Back to listing
            </Link>
            {article.status === 'published' && (
              <Link
                href={`/atlas-brief/${article.slug}`}
                target="_blank"
                rel="noopener"
                style={{ fontSize: 11, letterSpacing: 2, textTransform: 'uppercase', color: '#9A6B3F', textDecoration: 'none' }}
              >
                View on Atlas Brief ↗
              </Link>
            )}
          </div>
        </div>

        {(() => {
          const reactions = (article.david_reactions as {
            angles?: string[]
            response?: string
            recorded_at?: string | null
          } | null) ?? null
          const angles = reactions?.angles ?? []
          if (angles.length === 0) return null
          const facts: ListingFacts = {
            address: article.listing?.property?.street_address ?? null,
            city: article.listing?.property?.city ?? null,
            state: article.listing?.property?.state ?? null,
            status: article.listing?.status ?? null,
            year_built: article.listing?.property?.year_built ?? null,
            unit_count: article.listing?.property?.unit_count ?? null,
            gross_sf: article.listing?.property?.gross_sf ?? null,
            list_price: article.listing?.list_price ?? null,
            sale_price: article.listing?.sale_price ?? null,
            price_per_unit: article.listing?.price_per_unit ?? null,
            cap_rate_current: article.listing?.cap_rate_current ?? null,
            cap_rate_market: article.listing?.cap_rate_market ?? null,
            grm_current: article.listing?.grm_current ?? null,
            broker_name: article.listing?.listing_broker?.name ?? null,
            broker_firm: article.listing?.listing_broker?.firm ?? null,
            broker_phone: article.listing?.listing_broker?.phone ?? null,
            broker_email: article.listing?.listing_broker?.email ?? null,
          }
          return (
            <ReactionPanel
              articleId={article.id}
              angles={angles}
              initialResponse={reactions?.response ?? ''}
              recordedAt={reactions?.recorded_at ?? null}
              listingFacts={facts}
            />
          )
        })()}

        <ArticleEditor
          articleId={article.id}
          slug={article.slug}
          status={article.status}
          tapeTier={article.tape_tier ?? 3}
          aiDraft={(article.ai_draft as AIDraftShape | null) ?? null}
          articleHeroPhotoUrl={article.hero_photo_url ?? null}
          listingHeroPhotoUrl={article.listing?.hero_photo_url ?? null}
          listingAddress={article.listing?.property?.street_address ?? null}
          listingCity={article.listing?.property?.city ?? null}
          listingState={article.listing?.property?.state ?? null}
        />
      </div>
    </PageShell>
  )
}

function PageShell({ children }: { children: React.ReactNode }) {
  return (
    <div style={{ background: '#FAFAF8', minHeight: '100vh', fontFamily: '-apple-system, BlinkMacSystemFont, sans-serif' }}>
      <InternalNav active="articles" />
      {children}
    </div>
  )
}
