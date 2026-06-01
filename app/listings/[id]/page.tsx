import Link from 'next/link'
import { notFound, redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { compactDollars, dollars, num, pct, plain, date } from '@/lib/format'
import { rentRegulationLabel, parkingRatio, daysOnMarket, rentSpread, priorSale } from '@/lib/db/derive'
import AugmentForm from './AugmentForm'
import PhotosForm from './PhotosForm'
import BrokerHeadshotUploader from './BrokerHeadshotUploader'
import DeleteListingButton from './DeleteListingButton'
import RentRegulationOverride from './RentRegulationOverride'
import StatusEditor from './StatusEditor'
import DraftArticleButton from './DraftArticleButton'
import InternalNav from '@/app/InternalNav'

export const dynamic = 'force-dynamic'

type Demographics = {
  population: number | null
  households: number | null
  median_age: number | null
  median_hh_income: number | null
  daytime_employees: number | null
  population_growth_5y: number | null
  household_growth_5y: number | null
} | null

type UnitMixRow = {
  bed_type?: string | null
  units?: number | null
  avg_sf?: number | null
  asking_rent_per_unit?: number | null
  asking_rent_per_sf?: number | null
  concessions_pct?: number | null
}

type TransitRow = {
  name?: string | null
  type?: string | null
  drive_min?: number | null
  walk_min?: number | null
  distance_mi?: number | null
}

type AirportRow = {
  name?: string | null
  drive_min?: number | null
  distance_mi?: number | null
}

type TransactionRow = {
  type?: 'sale' | 'loan' | string | null
  subtype?: string | null
  date?: string | null
  recordation_date?: string | null
  sale_type?: string | null
  transaction_type?: string | null
  deed_type?: string | null
  document_number?: string | null
  buyer?: string | null
  seller?: string | null
  buyers?: string[] | null
  sellers?: string[] | null
  borrower?: string | null
  originator?: string | null
  title_company?: string | null
  price?: number | null
  loan_amount?: number | null
  loan_type?: string | null
  data_source?: string | null
  maturity_date?: string | null
  units?: number | null
  price_per_unit?: number | null
  cap_rate?: number | null
  source?: string | null
}

type AssessmentRow = {
  year?: number | null
  total_assessed?: number | null
  improved_assessed?: number | null
  land_assessed?: number | null
  pct_improved?: number | null
  tax_year?: number | null
  tax_amount?: number | null
}

type SourceQualifier = 'stated' | 'at_close' | 'proforma' | null | undefined

function sourceHint(source: SourceQualifier): string | undefined {
  if (!source) return undefined
  if (source === 'at_close') return 'at close'
  return source
}

type Tab = 'summary' | 'public_record' | 'contacts' | 'loan' | 'notes' | 'photos' | 'augment'
const TABS: { id: Tab; label: string }[] = [
  { id: 'summary', label: 'Summary' },
  { id: 'public_record', label: 'Public Record' },
  { id: 'contacts', label: 'Brokers & Contacts' },
  { id: 'loan', label: 'Loan' },
  { id: 'notes', label: 'Notes' },
  { id: 'photos', label: 'Photos' },
  { id: 'augment', label: 'Augment' },
]

export default async function ListingDetailPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>
  searchParams: Promise<{ tab?: string }>
}) {
  const [{ id }, sp] = await Promise.all([params, searchParams])
  const tab: Tab = (TABS.find(t => t.id === sp.tab)?.id ?? 'summary') as Tab

  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const { data: listing, error } = await supabase
    .from('listings')
    .select(`
      *,
      property:properties (*),
      listing_broker:brokers!listing_broker_id (*),
      buyer_broker:brokers!buyer_broker_id (*)
    `)
    .eq('id', id)
    .maybeSingle()

  if (error) {
    return <PageShell><ErrorBlock message={error.message} /></PageShell>
  }
  if (!listing) notFound()

  // Surface the existing (non-trashed) article so the header can show "edit
  // draft" vs "draft article" vs "edit published" buttons. Trashed articles
  // are ignored — the partial unique index lets a new draft coexist with
  // them.
  const { data: existingArticle } = await supabase
    .from('articles')
    .select('id, status, slug')
    .eq('listing_id', id)
    .is('deleted_at', null)
    .maybeSingle()

  const p = listing.property
  const lb = listing.listing_broker
  const bb = listing.buyer_broker

  const headlinePrice = listing.sale_price ?? listing.list_price
  const transactions = (p?.transaction_history as TransactionRow[] | null) ?? null
  const assessmentHistory = (p?.assessment_history as AssessmentRow[] | null) ?? null
  const unitMix = (listing.unit_mix as UnitMixRow[] | null) ?? null

  // Generate signed URLs for stored images (1 hour expiry)
  async function signPath(path: string | null | undefined): Promise<string | null> {
    if (!path) return null
    const { data } = await supabase.storage.from('property-assets').createSignedUrl(path, 3600)
    return data?.signedUrl ?? null
  }
  const heroPath = (listing.hero_photo_url as string | null) ?? null
  const photoUrls = ((listing.photo_urls as string[] | null) ?? []).filter(p => p && p.length > 0)
  const lbHeadshotPath = (lb?.headshot_url as string | null) ?? null
  const bbHeadshotPath = (bb?.headshot_url as string | null) ?? null

  const [heroSignedUrl, secondarySignedUrls, lbHeadshotSignedUrl, bbHeadshotSignedUrl] = await Promise.all([
    signPath(heroPath),
    Promise.all(photoUrls.map(p => signPath(p))),
    signPath(lbHeadshotPath),
    signPath(bbHeadshotPath),
  ])

  const heroAsset = heroPath ? { path: heroPath, signedUrl: heroSignedUrl } : null
  const secondaryAssets = photoUrls.map((p, i) => ({ path: p, signedUrl: secondarySignedUrls[i] ?? null }))
  const demo1 = (p?.demographics_1mi as Demographics) ?? null
  const demo3 = (p?.demographics_3mi as Demographics) ?? null
  const transit = (p?.transit_stations as TransitRow[] | null) ?? null
  const airports = (p?.airports as AirportRow[] | null) ?? null

  return (
    <PageShell>
      <div style={{ maxWidth: 1100, margin: '0 auto', padding: '32px 24px' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16, gap: 16 }}>
          <Link href="/listings" style={{ fontSize: 11, letterSpacing: 2, textTransform: 'uppercase', color: '#9A6B3F', textDecoration: 'none' }}>← Database</Link>
          <div style={{ display: 'flex', gap: 10, alignItems: 'center', flexWrap: 'wrap' }}>
            {!listing.deleted_at && (
              <DraftArticleButton
                listingId={listing.id}
                existing={existingArticle ? { id: existingArticle.id, status: existingArticle.status, slug: existingArticle.slug } : null}
              />
            )}
            {!listing.deleted_at && <DeleteListingButton listingId={listing.id} />}
          </div>
        </div>

        {listing.deleted_at && (
          <div style={{ padding: 12, background: '#fee', border: '1px solid #fcc', borderRadius: 4, color: '#c0392b', fontSize: 13, marginBottom: 16 }}>
            This listing is in Trash. It is excluded from the database and any analytics. Restore from the Trash tab in the Database to bring it back.
          </div>
        )}

        {/* always-visible header */}
        <div style={{ marginBottom: 16, display: 'flex', alignItems: 'center', gap: 12, flexWrap: 'wrap' }}>
          <StatusPill status={listing.status} />
          {listing.status === 'under_construction' && (listing.expected_delivery_date || listing.expected_delivery_note) && (
            <span style={{ fontSize: 12, letterSpacing: 1, textTransform: 'uppercase', color: '#8B6914', background: '#FFF8E7', padding: '4px 8px', borderRadius: 2, border: '1px solid #e8d49a' }}>
              Delivers {listing.expected_delivery_note ?? formatDeliveryMonth(listing.expected_delivery_date as string | null)}
            </span>
          )}
          <h1 style={{ fontFamily: 'Georgia, serif', fontSize: 28, color: '#111', margin: 0 }}>
            {p?.street_address ?? 'Unknown Property'}
          </h1>
          {p?.star_rating != null && <Stars n={p.star_rating} />}
        </div>
        <div style={{ fontSize: 14, color: '#666', marginBottom: 24 }}>
          {[p?.city, p?.state, p?.zip].filter(Boolean).join(', ')}
          {p?.submarket && <span> · {p.submarket}</span>}
          {p?.market && p.market !== p.submarket && <span> · {p.market}</span>}
        </div>

        {heroSignedUrl && (
          <div style={{ width: '100%', marginBottom: 24, borderRadius: 4, overflow: 'hidden', background: '#111' }}>
            <img
              src={heroSignedUrl}
              alt="Listing hero photo"
              style={{ width: '100%', height: 'auto', maxHeight: 520, display: 'block', objectFit: 'contain', margin: '0 auto' }}
            />
          </div>
        )}

        <StatsBar listing={listing} property={p} headlinePrice={headlinePrice} />

        {/* tab bar */}
        <div style={{ display: 'flex', gap: 0, marginBottom: 32, borderBottom: '1px solid #ddd', flexWrap: 'wrap' }}>
          {TABS.map(t => (
            <Link
              key={t.id}
              href={`/listings/${listing.id}?tab=${t.id}`}
              style={{
                padding: '10px 20px',
                fontSize: 11,
                letterSpacing: 2,
                textTransform: 'uppercase',
                color: tab === t.id ? '#111' : '#999',
                textDecoration: 'none',
                borderBottom: tab === t.id ? '2px solid #111' : '2px solid transparent',
                marginBottom: -1,
              }}
            >
              {t.label}
            </Link>
          ))}
        </div>

        {tab === 'summary' && (
          <SummaryTab listing={listing} p={p} unitMix={unitMix} />
        )}
        {tab === 'public_record' && (
          <PublicRecordTab listing={listing} p={p} transactions={transactions} assessmentHistory={assessmentHistory} demo1={demo1} demo3={demo3} />
        )}
        {tab === 'contacts' && (
          <ContactsTab
            lb={lb}
            bb={bb}
            p={p}
            lbHeadshotSignedUrl={lbHeadshotSignedUrl}
            bbHeadshotSignedUrl={bbHeadshotSignedUrl}
            lbHeadshotPath={lbHeadshotPath}
            bbHeadshotPath={bbHeadshotPath}
          />
        )}
        {tab === 'loan' && (
          <LoanTab listing={listing} transactions={transactions} />
        )}
        {tab === 'notes' && (
          <NotesTab p={p} transit={transit} airports={airports} secondaryAssets={secondaryAssets} />
        )}
        {tab === 'photos' && (
          <Section title="Listing Photos">
            <div style={{ fontSize: 13, color: '#666', marginBottom: 16, lineHeight: 1.6 }}>
              The hero image appears at the top of the listing detail and on the public article. Add up to 3 secondary photos for inline figures.
            </div>
            <PhotosForm listingId={listing.id} hero={heroAsset} secondaries={secondaryAssets} />
          </Section>
        )}
        {tab === 'augment' && (
          <div>
            <Section title="Augment listing data">
              <div style={{ fontSize: 13, color: '#666', marginBottom: 16, lineHeight: 1.6 }}>
                Copy a CoStar tab and paste it below. Claude extracts the relevant fields and merges them into this listing. The audit log is kept in <code>augmentation_log</code>.
              </div>
              <AugmentForm listingId={listing.id} />
            </Section>
          </div>
        )}

        {p?.costar_property_id && (
          <div style={{ fontSize: 11, color: '#999', marginTop: 32, textAlign: 'right' }}>CoStar Property ID: {p.costar_property_id}</div>
        )}
      </div>
    </PageShell>
  )
}

// ============================================================
// tab content
// ============================================================

function SummaryTab({
  listing,
  p,
  unitMix,
}: {
  listing: Record<string, unknown> & { [key: string]: unknown }
  p: Record<string, unknown> & { [key: string]: unknown } | null
  unitMix: UnitMixRow[] | null
}) {
  const l = listing as Record<string, unknown>
  return (
    <div>
      {p?.sale_highlights ? (
        <Section title="Sale Highlights">
          <div style={{ fontSize: 14, color: '#444', lineHeight: 1.7, whiteSpace: 'pre-wrap' }}>{String(p.sale_highlights)}</div>
        </Section>
      ) : null}

      <Grid>
        <Section title="Sale">
          <Field label="Status" value={plain(l.status as string | null)} />
          <StatusEditor listingId={l.id as string} currentStatus={l.status as string | null} />
          <Field label="List Price" value={dollars(l.list_price as number | null)} />
          <Field label="Sale Price" value={dollars(l.sale_price as number | null)} />
          <Field label="Bid/Ask Delta" value={dollars(l.bid_ask_delta as number | null)} hint="derived" />
          <Field label="Sale Date" value={date(l.sale_date as string | null)} />
          <Field label="List Date" value={date(l.list_date as string | null)} />
          {l.status === 'under_construction' && (
            <Field
              label="Expected Delivery"
              value={
                l.expected_delivery_note
                  ? String(l.expected_delivery_note)
                  : l.expected_delivery_date
                  ? formatDeliveryMonth(l.expected_delivery_date as string | null)
                  : '—'
              }
            />
          )}
          {(() => {
            const dom = daysOnMarket({
              list_date: l.list_date as string | null,
              sale_date: l.sale_date as string | null,
              status: l.status as string | null,
            })
            return <Field label="Days on Market" value={dom != null ? `${dom} days` : '—'} hint="derived" />
          })()}
          <Field label="Sale Type" value={plain(l.sale_type as string | null)} />
          <Field label="Price / Unit" value={dollars(l.price_per_unit as number | null)} />
          <Field label="Price / SF" value={dollars(l.price_per_sf as number | null)} />
        </Section>

        <Section title="Yield (Current vs Market)">
          <Field label="CAP Current" value={pct(l.cap_rate_current as number | null)} hint={sourceHint(l.cap_rate_current_source as SourceQualifier)} />
          <Field label="CAP Market" value={pct(l.cap_rate_market as number | null)} hint={l.cap_rate_market == null ? 'om-pending' : sourceHint(l.cap_rate_market_source as SourceQualifier)} />
          <Field label="GRM Current" value={plain(l.grm_current as number | null)} hint={sourceHint(l.grm_current_source as SourceQualifier)} />
          <Field label="GRM Market" value={plain(l.grm_market as number | null)} hint={l.grm_market == null ? 'om-pending' : sourceHint(l.grm_market_source as SourceQualifier)} />
          <Field label="NOI" value={dollars(l.noi_current as number | null)} />
          <Field label="Implied Gross Annual" value={dollars(l.implied_gross_annual_current as number | null)} hint="derived" />
          <Field label="Implied Monthly Rent / Unit" value={dollars(l.implied_monthly_rent_current as number | null)} hint="derived" />
          <Field label="Expense Ratio" value={pct(l.expense_ratio as number | null)} hint={l.expense_ratio == null ? 'om-pending' : undefined} />
          {(() => {
            const spread = rentSpread(l.unit_mix)
            if (!spread || spread.loss_to_lease_monthly == null) return null
            const pctLabel = spread.loss_to_lease_pct != null ? ` (${spread.loss_to_lease_pct.toFixed(1)}%)` : ''
            return (
              <Field
                label="Loss to Lease (Monthly)"
                value={`${dollars(spread.loss_to_lease_monthly)}${pctLabel}`}
                hint="derived"
              />
            )
          })()}
        </Section>
      </Grid>

      <Section title="Regulatory">
        <Grid>
          <div>
            {(() => {
              const derived = rentRegulationLabel({
                rso_applicable: l.rso_applicable as boolean | null,
                ab1482_applicable: l.ab1482_applicable as boolean | null,
              })
              const effective = rentRegulationLabel({
                rso_applicable: l.rso_applicable as boolean | null,
                ab1482_applicable: l.ab1482_applicable as boolean | null,
                override: l.rent_regulation_override as string | null,
              })
              return (
                <>
                  <Field
                    label="Rent Regulation"
                    value={plain(effective)}
                    hint={l.rent_regulation_override ? 'manual override' : 'derived from year built'}
                  />
                  <RentRegulationOverride
                    listingId={l.id as string}
                    currentOverride={(l.rent_regulation_override as string | null) ?? null}
                    derivedLabel={derived}
                  />
                </>
              )
            })()}
            <Field label="RSO Applicable" value={plain(l.rso_applicable as boolean | null)} hint="derived" />
            <Field label="AB 1482 Applicable" value={plain(l.ab1482_applicable as boolean | null)} hint="derived" />
          </div>
          <div>
            <Field label="ULA Threshold" value={plain(l.ula_threshold_status as string | null)} hint="derived" />
            <Field label="ULA Tax Estimate" value={dollars(l.ula_tax_estimate as number | null)} hint="derived" />
          </div>
        </Grid>
      </Section>

      <Grid>
        <Section title="Building">
          <Field label="Property Type" value={plain(p?.property_type as string | null)} />
          <Field label="Class" value={plain(p?.property_class as string | null)} />
          <Field label="Star Rating" value={plain(p?.star_rating as number | null)} />
          <Field label="Units" value={plain(p?.unit_count as number | null)} />
          <Field label="Avg Unit Size" value={p?.avg_unit_sf ? `${p.avg_unit_sf} SF` : '—'} />
          <Field label="Stories" value={plain(p?.stories as number | null)} />
          <Field label="Bldg SF" value={p?.gross_sf ? Number(p.gross_sf).toLocaleString() + ' SF' : '—'} />
          <Field label="Year Built" value={plain(p?.year_built as number | null)} />
          <Field label="Year Renovated" value={plain(p?.year_renovated as number | null)} />
          <Field label="Construction" value={plain(p?.construction_type as string | null)} />
          <Field label="Architectural Notes" value={plain(p?.architectural_notes as string | null)} hint={p?.architectural_notes ? undefined : 'om-pending'} />
          <Field label="Soft Story Retrofit" value={plain(p?.soft_story_retrofit as boolean | null)} />
        </Section>

        <Section title="Land & Parking">
          <Field label="Land Acres" value={p?.land_acres ? `${p.land_acres} AC` : '—'} />
          <Field label="Lot SF" value={p?.lot_sf ? Number(p.lot_sf).toLocaleString() + ' SF' : '—'} />
          <Field label="Building FAR" value={plain(p?.bldg_far as number | null)} />
          <Field label="Zoning" value={plain(p?.zoning as string | null)} />
          <Field label="APN / Parcel" value={plain(p?.apn as string | null)} />
          <Field label="Parking Type" value={plain(p?.parking_type as string | null)} />
          <Field label="Parking Count" value={plain(p?.parking_count as number | null)} />
          {(() => {
            const ratio = parkingRatio({
              parking_count: p?.parking_count as number | null,
              unit_count: p?.unit_count as number | null,
            })
            return <Field label="Parking Ratio" value={ratio != null ? `${ratio.toFixed(2)} / unit` : '—'} hint="derived" />
          })()}
        </Section>
      </Grid>

      <Section title="Walk & Transit Scores">
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '0 48px' }}>
          <Field label="Pedestrian" value={plain(p?.pedestrian_score as number | null)} />
          <Field label="Cycling" value={plain(p?.cycling_score as number | null)} />
          <Field label="Car" value={plain(p?.car_score as number | null)} />
          <Field label="Transit" value={plain(p?.transit_score as number | null)} />
          <Field label="Walk Score" value={plain(p?.walk_score as number | null)} />
          <Field label="Bike Score" value={plain(p?.bike_score as number | null)} />
        </div>
      </Section>

      {unitMix && unitMix.length > 0 && (
        <Section title={`Unit Mix${listing.unit_mix_updated ? ` — Updated ${date(String(listing.unit_mix_updated))}` : ''}`}>
          <DataTable
            headers={['Bed', 'Units', 'Avg SF', 'Rent / Unit', 'Rent / SF', 'Concessions']}
            rows={unitMix.map(r => [
              r.bed_type ?? '—',
              num(r.units),
              num(r.avg_sf),
              dollars(r.asking_rent_per_unit),
              dollars(r.asking_rent_per_sf),
              pct(r.concessions_pct),
            ])}
          />
        </Section>
      )}

      {(p?.vacancy_rate_subject != null || p?.market_rent_subject != null) && (
        <Section title="Market Conditions">
          <DataTable
            headers={['', 'Subject', 'Submarket', 'Market']}
            rows={[
              ['Vacancy', pct(p?.vacancy_rate_subject as number | null), pct(p?.vacancy_rate_submarket as number | null), pct(p?.vacancy_rate_market as number | null)],
              ['Market Rent / Unit', dollars(p?.market_rent_subject as number | null), dollars(p?.market_rent_submarket as number | null), dollars(p?.market_rent_market as number | null)],
              ['Concessions', pct(p?.concessions_subject as number | null), pct(p?.concessions_submarket as number | null), pct(p?.concessions_market as number | null)],
            ]}
          />
        </Section>
      )}
    </div>
  )
}

function PublicRecordTab({
  listing,
  p,
  transactions,
  assessmentHistory,
  demo1,
  demo3,
}: {
  listing: Record<string, unknown>
  p: Record<string, unknown> | null
  transactions: TransactionRow[] | null
  assessmentHistory: AssessmentRow[] | null
  demo1: Demographics
  demo3: Demographics
}) {
  const allTx = transactions ?? []
  const sales = allTx.filter(t => t.type === 'sale')
  const loans = allTx.filter(t => t.type === 'loan')

  return (
    <div>
      <Grid>
        <Section title="Recorded Owner">
          <Field label="Name" value={plain(p?.recorded_owner as string | null)} />
          <Field label="Ownership Type" value={plain(p?.owner_type as string | null)} />
          <Field label="Mailing Address" value={plain(p?.owner_mailing_address as string | null)} hint={p?.owner_mailing_address ? undefined : 'augment-pending'} />
          <Field label="Address (record)" value={plain(p?.recorded_owner_address as string | null)} hint={p?.recorded_owner_address ? undefined : 'augment-pending'} />
          <Field label="Owner Since" value={date(p?.recorded_owner_since as string | null)} />
        </Section>

        <Section title="Parcel & Legal">
          <Field label="APN" value={plain(p?.apn as string | null)} />
          <Field label="Subdivision" value={plain(p?.subdivision as string | null)} hint={p?.subdivision ? undefined : 'augment-pending'} />
          <Field label="Legal Description" value={plain(p?.legal_description as string | null)} hint={p?.legal_description ? undefined : 'augment-pending'} />
          <Field label="Census Tract" value={plain(p?.census_tract as string | null)} hint={p?.census_tract ? undefined : 'augment-pending'} />
          <Field label="Municipality" value={plain(p?.municipality as string | null)} hint={p?.municipality ? undefined : 'augment-pending'} />
          <Field label="Land Use" value={plain(p?.land_use as string | null)} hint={p?.land_use ? undefined : 'augment-pending'} />
          <Field label="Zoning" value={plain(p?.zoning as string | null)} />
        </Section>
      </Grid>

      {/* Sale Detail (Sales Comp augmentation) */}
      <SaleDetailSection listing={listing} transactions={transactions} />

      {sales.length > 0 ? (
        <Section title="Sale History">
          <DataTable
            headers={['Date', 'Type', 'Price', 'Buyer', 'Seller', 'Doc #']}
            rows={sales.map(t => [
              date(t.date),
              t.transaction_type ?? t.subtype ?? '—',
              dollars(t.price ?? null),
              t.buyer ?? ((t.buyers ?? []).join('; ') || '—'),
              t.seller ?? ((t.sellers ?? []).join('; ') || '—'),
              t.document_number ?? '—',
            ])}
          />
        </Section>
      ) : (
        <Section title="Sale History">
          <AugmentNote text="Paste the Public Record tab via the Augment tab to populate sale history." />
        </Section>
      )}

      {loans.length > 0 && (
        <Section title="Loan History (sales tab view)">
          <DataTable
            headers={['Date', 'Maturity', 'Amount', 'Borrower', 'Originator', 'Source']}
            rows={loans.map(t => [
              date(t.date),
              date(t.maturity_date),
              dollars(t.loan_amount ?? null),
              t.borrower ?? '—',
              t.originator ?? '—',
              t.data_source ?? t.source ?? '—',
            ])}
          />
        </Section>
      )}

      {assessmentHistory && assessmentHistory.length > 0 ? (
        <Section title="Assessment History">
          <DataTable
            headers={['Year', 'Total', 'Improved', 'Land', '% Improved', 'Tax Year', 'Tax']}
            rows={assessmentHistory.map(r => [
              plain(r.year),
              dollars(r.total_assessed ?? null),
              dollars(r.improved_assessed ?? null),
              dollars(r.land_assessed ?? null),
              pct(r.pct_improved ?? null),
              plain(r.tax_year),
              dollars(r.tax_amount ?? null),
            ])}
          />
        </Section>
      ) : (
        <Section title="Assessment History">
          <AugmentNote text="Paste the Public Record tab via the Augment tab to populate 5-year assessment history." />
        </Section>
      )}

      <Grid>
        <Section title={`Public Record (PDF)${p?.assessment_year ? ` — ${p.assessment_year}` : ''}`}>
          <Field label="Total Assessed" value={dollars(p?.assessed_total as number | null)} />
          <Field label="Improvements" value={dollars(p?.assessed_improvements as number | null)} />
          <Field label="Land" value={dollars(p?.assessed_land as number | null)} />
          <Field label="Annual Tax" value={dollars(p?.annual_tax as number | null)} />
          <Field label="Tax / Unit" value={dollars(p?.tax_per_unit as number | null)} />
          <Field label="Tax Year" value={plain(p?.tax_year as number | null)} />
        </Section>

        <Section title="Flood Risk">
          <Field label="Flood Risk Area" value={plain(p?.flood_risk_area as string | null)} />
          <Field label="FEMA Flood Zone" value={plain(p?.flood_zone as string | null)} />
          <Field label="In SFHA" value={plain(p?.in_sfha as boolean | null)} />
          <Field label="FEMA Map ID" value={plain(p?.fema_map_id as string | null)} />
          <Field label="FEMA Map Date" value={plain(p?.fema_map_date as string | null)} />
        </Section>
      </Grid>

      {(demo1 || demo3) && (
        <Section title="Demographics">
          <DataTable
            headers={['', '1 mile', '3 miles']}
            rows={[
              ['Population', num(demo1?.population), num(demo3?.population)],
              ['Households', num(demo1?.households), num(demo3?.households)],
              ['Median Age', demo1?.median_age == null ? '—' : demo1.median_age.toFixed(1), demo3?.median_age == null ? '—' : demo3.median_age.toFixed(1)],
              ['Median HH Income', dollars(demo1?.median_hh_income), dollars(demo3?.median_hh_income)],
              ['Daytime Employees', num(demo1?.daytime_employees), num(demo3?.daytime_employees)],
              ['Population Growth (5y)', pct(demo1?.population_growth_5y), pct(demo3?.population_growth_5y)],
              ['Household Growth (5y)', pct(demo1?.household_growth_5y), pct(demo3?.household_growth_5y)],
            ]}
          />
        </Section>
      )}
    </div>
  )
}

function ContactsTab({
  lb,
  bb,
  p,
  lbHeadshotSignedUrl,
  bbHeadshotSignedUrl,
  lbHeadshotPath,
  bbHeadshotPath,
}: {
  lb: Record<string, unknown> | null
  bb: Record<string, unknown> | null
  p: Record<string, unknown> | null
  lbHeadshotSignedUrl: string | null
  bbHeadshotSignedUrl: string | null
  lbHeadshotPath: string | null
  bbHeadshotPath: string | null
}) {
  return (
    <div>
      <Grid>
        <Section title="Listing Broker">
          {lb ? (
            <>
              <BrokerHeadshotUploader
                brokerId={lb.id as string}
                brokerName={(lb.name as string | null) ?? null}
                currentSignedUrl={lbHeadshotSignedUrl}
                currentPath={lbHeadshotPath}
              />
              <Field label="Name" value={plain(lb.name as string | null)} />
              <Field label="Title" value={plain(lb.title as string | null)} />
              <Field label="Firm" value={plain(lb.firm as string | null)} />
              <Field label="Phone" value={plain(lb.phone as string | null)} />
              <Field label="Cell" value={plain(lb.cell as string | null)} />
              <Field label="Email" value={plain(lb.email as string | null)} />
              <Field label="DRE License" value={plain(lb.dre_license as string | null)} />
              <Field label="Office Address" value={plain(lb.office_address as string | null)} />
            </>
          ) : (
            <AugmentNote text="No listing broker captured. Paste the Contacts tab via Augment to populate." />
          )}
        </Section>

        <Section title="Buyer Broker">
          {bb ? (
            <>
              <BrokerHeadshotUploader
                brokerId={bb.id as string}
                brokerName={(bb.name as string | null) ?? null}
                currentSignedUrl={bbHeadshotSignedUrl}
                currentPath={bbHeadshotPath}
              />
              <Field label="Name" value={plain(bb.name as string | null)} />
              <Field label="Firm" value={plain(bb.firm as string | null)} />
              <Field label="Phone" value={plain(bb.phone as string | null)} />
              <Field label="Email" value={plain(bb.email as string | null)} />
              <Field label="DRE License" value={plain(bb.dre_license as string | null)} />
            </>
          ) : (
            <AugmentNote text="Buyer broker captured from the OM (sold deals) or the Contacts tab if visible." />
          )}
        </Section>
      </Grid>

      <Grid>
        <Section title="Property Management">
          <Field label="Manager" value={plain(p?.property_manager as string | null)} />
          <Field label="Phone" value={plain(p?.pm_phone as string | null)} />
          <Field label="Address" value={plain(p?.pm_address as string | null)} hint={p?.pm_address ? undefined : 'augment-pending'} />
          <Field label="Manager Since" value={plain(p?.pm_since as string | null)} />
        </Section>

        <Section title="True Owner">
          <Field label="Name" value={plain(p?.true_owner as string | null)} />
          <Field label="Address" value={plain(p?.true_owner_address as string | null)} hint={p?.true_owner_address ? undefined : 'augment-pending'} />
          <Field label="Phone" value={plain(p?.true_owner_phone as string | null)} hint={p?.true_owner_phone ? undefined : 'augment-pending'} />
          <Field label="Owner Since" value={date(p?.true_owner_since as string | null)} />
        </Section>
      </Grid>
    </div>
  )
}

function LoanTab({ listing, transactions }: {
  listing: Record<string, unknown>
  transactions: TransactionRow[] | null
}) {
  const loans = (transactions ?? []).filter(t => t.type === 'loan')
  return (
    <div>
      <Section title="Current Loan (this listing)">
        <Grid>
          <div>
            <Field label="Origination Amount" value={dollars(listing.loan_amount as number | null)} />
            <Field label="Origination Date" value={date(listing.loan_origination_date as string | null)} />
            <Field label="Maturity Date" value={date(listing.loan_maturity_date as string | null)} />
            <Field label="Lender" value={plain(listing.lender as string | null)} />
          </div>
          <div>
            <Field label="Borrower" value={plain(listing.borrower as string | null)} />
            <Field label="Loan Type" value={plain(listing.loan_type as string | null)} />
            <Field label="Doc Number" value={plain(listing.loan_doc_number as string | null)} />
          </div>
        </Grid>
      </Section>

      {loans.length > 0 ? (
        <Section title="Loan History">
          <DataTable
            headers={['Date', 'Maturity', 'Amount', 'Type', 'Borrower', 'Originator', 'Source']}
            rows={loans.map(t => [
              date(t.date),
              date(t.maturity_date),
              dollars(t.loan_amount ?? null),
              t.loan_type ?? '—',
              t.borrower ?? '—',
              t.originator ?? '—',
              t.data_source ?? t.source ?? '—',
            ])}
          />
        </Section>
      ) : (
        <Section title="Loan History">
          <AugmentNote text="Paste the Loan or Public Record tab via Augment to populate loan history." />
        </Section>
      )}
    </div>
  )
}

function NotesTab({ p, transit, airports, secondaryAssets }: {
  p: Record<string, unknown> | null
  transit: TransitRow[] | null
  airports: AirportRow[] | null
  secondaryAssets: { path: string; signedUrl: string | null }[]
}) {
  const visiblePhotos = secondaryAssets.filter(a => a.signedUrl)
  return (
    <div>
      {visiblePhotos.length > 0 && (
        <Section title="Listing Photos">
          <div style={{ display: 'grid', gridTemplateColumns: `repeat(${Math.min(visiblePhotos.length, 3)}, 1fr)`, gap: 16 }}>
            {visiblePhotos.map((a, i) => (
              <div key={i} style={{ background: '#f5f5f5', borderRadius: 4, overflow: 'hidden', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <img
                  src={a.signedUrl ?? ''}
                  alt={`Listing photo ${i + 1}`}
                  style={{ maxWidth: '100%', maxHeight: 280, height: 'auto', display: 'block' }}
                />
              </div>
            ))}
          </div>
        </Section>
      )}

      {p?.building_notes ? (
        <Section title="Building Notes">
          <div style={{ fontSize: 14, color: '#444', lineHeight: 1.7, whiteSpace: 'pre-wrap' }}>{String(p.building_notes)}</div>
        </Section>
      ) : null}

      {p?.value_add_notes ? (
        <Section title="Value Add Notes">
          <div style={{ fontSize: 14, color: '#444', lineHeight: 1.6 }}>{String(p.value_add_notes)}</div>
        </Section>
      ) : null}

      {p?.capital_improvements ? (
        <Section title="Capital Improvements">
          <div style={{ fontSize: 14, color: '#444', lineHeight: 1.6 }}>{String(p.capital_improvements)}</div>
        </Section>
      ) : null}

      {Array.isArray(p?.amenities) && (p.amenities as string[]).length > 0 && (
        <Section title="Amenities">
          <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
            {(p.amenities as string[]).map((a, i) => (
              <span key={i} style={{ padding: '4px 12px', background: '#f0f0f0', borderRadius: 2, fontSize: 12 }}>{a}</span>
            ))}
          </div>
        </Section>
      )}

      <Section title="Location">
        <Grid>
          <div>
            <Field label="Street Address" value={plain(p?.street_address as string | null)} />
            <Field label="City" value={plain(p?.city as string | null)} />
            <Field label="State" value={plain(p?.state as string | null)} />
            <Field label="ZIP" value={plain(p?.zip as string | null)} />
            <Field label="County" value={plain(p?.county as string | null)} />
          </div>
          <div>
            <Field label="Market" value={plain(p?.market as string | null)} />
            <Field label="Submarket" value={plain(p?.submarket as string | null)} />
            <Field label="Submarket Cluster" value={plain(p?.submarket_cluster as string | null)} />
            <Field label="Neighborhood" value={plain(p?.neighborhood as string | null)} />
            <Field label="CBSA" value={plain(p?.cbsa as string | null)} />
            <Field label="DMA" value={plain(p?.dma as string | null)} />
          </div>
        </Grid>
      </Section>

      {transit && transit.length > 0 && (
        <Section title="Public Transportation">
          <DataTable
            headers={['Station', 'Type', 'Drive', 'Walk', 'Distance']}
            rows={transit.map(r => [
              r.name ?? '—',
              r.type ?? '—',
              r.drive_min != null ? r.drive_min + ' min' : '—',
              r.walk_min != null ? r.walk_min + ' min' : '—',
              r.distance_mi != null ? r.distance_mi + ' mi' : '—',
            ])}
          />
        </Section>
      )}

      {airports && airports.length > 0 && (
        <Section title="Airports">
          <DataTable
            headers={['Airport', 'Drive', 'Distance']}
            rows={airports.map(r => [
              r.name ?? '—',
              r.drive_min != null ? r.drive_min + ' min' : '—',
              r.distance_mi != null ? r.distance_mi + ' mi' : '—',
            ])}
          />
        </Section>
      )}

      <Section title="From OM (Phase 1.5)">
        <AugmentNote text="Photos with attribution, verbatim marketing quotes, per-unit rent roll, in-unit features. Captured from broker OM PDFs in the next phase." />
      </Section>
    </div>
  )
}

// ============================================================
// shared
// ============================================================

function StatsBar({ listing, property: p, headlinePrice }: {
  listing: Record<string, unknown>
  property: Record<string, unknown> | null
  headlinePrice: number | null | undefined
}) {
  return (
    <div style={{ background: '#111', color: '#fff', padding: '16px 24px', borderRadius: 4, marginBottom: 24, display: 'flex', gap: 32, flexWrap: 'wrap' }}>
      {[
        { label: 'Units', value: num(p?.unit_count as number | null) },
        { label: 'Year Built', value: plain(p?.year_built as number | null) },
        { label: 'Bldg SF', value: p?.gross_sf ? Number(p.gross_sf).toLocaleString() + ' SF' : '—' },
        { label: 'Price', value: compactDollars(headlinePrice) },
        { label: '$/Unit', value: compactDollars(listing.price_per_unit as number | null) },
        { label: '$/SF', value: dollars(listing.price_per_sf as number | null) },
        { label: 'CAP', value: listing.cap_rate_current != null ? listing.cap_rate_current + '%' : '—' },
        { label: 'GRM', value: plain(listing.grm_current as number | null) },
        { label: 'Class', value: plain(p?.property_class as string | null) },
      ].map(({ label, value }) => (
        <div key={label}>
          <div style={{ fontSize: 10, letterSpacing: 2, textTransform: 'uppercase', color: '#9A6B3F', marginBottom: 4 }}>{label}</div>
          <div style={{ fontSize: 16, fontWeight: 600 }}>{value}</div>
        </div>
      ))}
    </div>
  )
}

function PageShell({ children }: { children: React.ReactNode }) {
  return (
    <div style={{ background: '#FAFAF8', minHeight: '100vh', fontFamily: '-apple-system, BlinkMacSystemFont, sans-serif' }}>
      <InternalNav active="listings" />
      {children}
    </div>
  )
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div style={{ marginBottom: 32 }}>
      <div style={{ fontSize: 11, letterSpacing: 3, textTransform: 'uppercase', color: '#666', marginBottom: 16, borderBottom: '2px solid #111', paddingBottom: 8 }}>{title}</div>
      {children}
    </div>
  )
}

function Grid({ children }: { children: React.ReactNode }) {
  return <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0 48px' }}>{children}</div>
}

function Field({ label, value, hint }: { label: string; value: string; hint?: string }) {
  const isOMPending = hint === 'om-pending'
  const isAugmentPending = hint === 'augment-pending'
  const isDerived = hint === 'derived'
  const empty = value === '—'
  return (
    <div style={{ borderBottom: '1px solid #eee', paddingBottom: 10, marginBottom: 10 }}>
      <div style={{ fontSize: 10, letterSpacing: 2, textTransform: 'uppercase', color: '#9A6B3F', marginBottom: 4, display: 'flex', alignItems: 'center', gap: 8 }}>
        <span>{label}</span>
        {isDerived && <span style={{ fontSize: 9, color: '#aaa', textTransform: 'lowercase', letterSpacing: 1 }}>(derived)</span>}
        {isOMPending && empty && <span style={{ fontSize: 9, color: '#c08c2a', textTransform: 'lowercase', letterSpacing: 1, fontStyle: 'italic' }}>(om pending)</span>}
        {isAugmentPending && empty && <span style={{ fontSize: 9, color: '#5b87b5', textTransform: 'lowercase', letterSpacing: 1, fontStyle: 'italic' }}>(augment pending)</span>}
        {hint && !['om-pending', 'augment-pending', 'derived'].includes(hint) && (
          <span style={{ fontSize: 9, color: '#aaa', textTransform: 'lowercase', letterSpacing: 1 }}>({hint})</span>
        )}
      </div>
      <div style={{ fontSize: 14, color: empty ? '#bbb' : '#111' }}>{value}</div>
    </div>
  )
}

function DataTable({ headers, rows }: { headers: string[]; rows: string[][] }) {
  return (
    <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
      <thead>
        <tr style={{ borderBottom: '1px solid #ddd', color: '#9A6B3F', fontSize: 10, textTransform: 'uppercase', letterSpacing: 2 }}>
          {headers.map((h, i) => (
            <th key={i} style={{ textAlign: i === 0 ? 'left' : 'right', padding: '8px 0' }}>{h}</th>
          ))}
        </tr>
      </thead>
      <tbody>
        {rows.map((row, ri) => (
          <tr key={ri} style={{ borderBottom: '1px solid #f0f0f0' }}>
            {row.map((cell, ci) => (
              <td key={ci} style={{ padding: '10px 0', textAlign: ci === 0 ? 'left' : 'right' }}>{cell}</td>
            ))}
          </tr>
        ))}
      </tbody>
    </table>
  )
}

function formatDeliveryMonth(s: string | null): string {
  if (!s) return '—'
  const d = new Date(s)
  if (isNaN(d.getTime())) return s
  return d.toLocaleDateString('en-US', { year: 'numeric', month: 'short' })
}

function StatusPill({ status }: { status: string | null }) {
  if (!status) return <span style={{ color: '#bbb' }}>—</span>
  const bg =
    status === 'sold' ? '#c0392b' :
    status === 'for_sale' ? '#27ae60' :
    status === 'under_construction' ? '#d68910' :
    '#7f8c8d'
  const label =
    status === 'sold' ? 'Sold' :
    status === 'for_sale' ? 'For Sale' :
    status === 'under_construction' ? 'Under Construction' :
    'Off Market'
  return (
    <span style={{ padding: '4px 10px', borderRadius: 2, fontSize: 11, fontWeight: 700, letterSpacing: 2, textTransform: 'uppercase', background: bg, color: '#fff' }}>
      {label}
    </span>
  )
}

function Stars({ n }: { n: number | null }) {
  if (n == null) return null
  return (
    <span style={{ color: '#9A6B3F', letterSpacing: 2 }}>
      {'★'.repeat(Math.floor(n))}
      {'☆'.repeat(Math.max(0, 5 - Math.floor(n)))}
    </span>
  )
}

function AugmentNote({ text }: { text: string }) {
  return (
    <div style={{ padding: 16, background: '#F0F4FA', border: '1px dashed #5b87b5', borderRadius: 4, fontSize: 13, color: '#385878' }}>
      <div style={{ fontSize: 10, letterSpacing: 2, textTransform: 'uppercase', color: '#5b87b5', marginBottom: 4 }}>Augment Pending</div>
      {text}
    </div>
  )
}

function SaleDetailSection({ listing, transactions }: { listing: Record<string, unknown>; transactions: TransactionRow[] | null }) {
  const l = listing
  const prior = priorSale({
    transaction_history: transactions,
    current_sale_date: (l.sale_date as string | null) ?? null,
  })
  const hasAny =
    l.sale_notes != null ||
    l.true_buyer != null ||
    l.true_seller != null ||
    l.recorded_buyer != null ||
    l.recorded_seller != null ||
    l.hold_period_months != null ||
    l.initial_ask_price != null ||
    l.buyer_activity_acquisitions != null ||
    prior != null

  if (!hasAny) {
    return (
      <Section title="Sale Detail">
        <AugmentNote text="Paste a CoStar Sales Comp page via Augment to capture true buyer/seller, hold period, sale notes narrative, initial ask price, and buyer activity history." />
      </Section>
    )
  }

  return (
    <Section title="Sale Detail">
      <Grid>
        <div>
          <Field label="Initial Ask Price" value={dollars(l.initial_ask_price as number | null)} />
          <Field label="Sale Price" value={dollars(l.sale_price as number | null)} />
          <Field label="Bid/Ask Delta" value={dollars(l.bid_ask_delta as number | null)} hint="derived" />
          <Field label="Hold Period" value={l.hold_period_months != null ? `${l.hold_period_months} months` : '—'} />
          <Field label="Recording Date" value={date(l.recording_date as string | null)} />
          <Field label="Transfer Tax" value={dollars(l.transfer_tax as number | null)} />
          <Field label="Price Status" value={plain(l.price_status as string | null)} />
          <Field label="Comp Status" value={plain(l.comp_status as string | null)} />
        </div>
        <div>
          <Field label="$/Acre Land" value={dollars(l.price_per_acre_land as number | null)} />
          <Field label="$/SF Land" value={dollars(l.price_per_sf_land as number | null)} />
        </div>
      </Grid>

      <Grid>
        <Section title="Buyer">
          <Field label="True Buyer" value={plain(l.true_buyer as string | null)} />
          <Field label="Recorded Buyer" value={plain(l.recorded_buyer as string | null)} />
          <Field label="Type" value={plain(l.buyer_type as string | null)} />
          <Field label="Secondary Type" value={plain(l.buyer_secondary_type as string | null)} />
          <Field label="Origin" value={plain(l.buyer_origin as string | null)} />
          <Field label="Contact" value={plain(l.buyer_contact as string | null)} />
          <Field label="Phone" value={plain(l.buyer_phone as string | null)} />
          <Field label="5y Acquisitions" value={dollars(l.buyer_activity_acquisitions as number | null)} />
          <Field label="5y Dispositions" value={dollars(l.buyer_activity_dispositions as number | null)} />
        </Section>

        <Section title="Seller">
          <Field label="True Seller" value={plain(l.true_seller as string | null)} />
          <Field label="Recorded Seller" value={plain(l.recorded_seller as string | null)} />
          <Field label="Type" value={plain(l.seller_type as string | null)} />
          <Field label="Secondary Type" value={plain(l.seller_secondary_type as string | null)} />
          <Field label="Contact" value={plain(l.seller_contact as string | null)} />
          <Field label="Phone" value={plain(l.seller_phone as string | null)} />
        </Section>
      </Grid>

      {prior ? (
        <Section title="Prior Sale">
          <Grid>
            <div>
              <Field label="Date" value={date(prior.date)} hint="derived" />
              <Field label="Price" value={dollars(prior.price)} hint="derived" />
            </div>
            <div>
              <Field label="Buyer" value={plain(prior.buyer)} hint="derived" />
              <Field label="Seller" value={plain(prior.seller)} hint="derived" />
              {prior.hold_period_years != null && (
                <Field label="Hold Period" value={`${prior.hold_period_years} years`} hint="derived" />
              )}
            </div>
          </Grid>
        </Section>
      ) : null}

      {l.sale_notes ? (
        <Section title="Sale Notes">
          <div style={{ fontSize: 14, color: '#444', lineHeight: 1.7, whiteSpace: 'pre-wrap' }}>{String(l.sale_notes)}</div>
        </Section>
      ) : null}
    </Section>
  )
}

function ErrorBlock({ message }: { message: string }) {
  return (
    <div style={{ maxWidth: 600, margin: '40px auto', padding: 24, background: '#fee', border: '1px solid #fcc', borderRadius: 4, color: '#c0392b', fontSize: 13 }}>
      Error: {message}
    </div>
  )
}
