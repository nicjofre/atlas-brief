import Link from 'next/link'
import { notFound, redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { compactDollars, dollars, num, pct, plain, date } from '@/lib/format'

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

type SaleHistoryRow = {
  date?: string | null
  type?: string | null
  price?: number | null
  units?: number | null
  price_per_unit?: number | null
  cap_rate?: number | null
  buyer?: string | null
  seller?: string | null
}

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

export default async function ListingDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
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
    return (
      <PageShell>
        <ErrorBlock message={error.message} />
      </PageShell>
    )
  }

  if (!listing) notFound()

  const p = listing.property
  const lb = listing.listing_broker
  const bb = listing.buyer_broker

  const headlinePrice = listing.sale_price ?? listing.list_price
  const demo1 = (p?.demographics_1mi as Demographics) ?? null
  const demo3 = (p?.demographics_3mi as Demographics) ?? null
  const transit = (p?.transit_stations as TransitRow[] | null) ?? null
  const airports = (p?.airports as AirportRow[] | null) ?? null
  const unitMix = (listing.unit_mix as UnitMixRow[] | null) ?? null
  const saleHistory = (listing.sale_history as SaleHistoryRow[] | null) ?? null

  return (
    <PageShell>
      <div style={{ maxWidth: 1100, margin: '0 auto', padding: '32px 24px' }}>

        <BreadcrumbBack />

        {/* Header */}
        <div style={{ marginBottom: 24, display: 'flex', alignItems: 'center', gap: 12, flexWrap: 'wrap' }}>
          <StatusPill status={listing.status} />
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

        {/* Stats bar */}
        <div style={{ background: '#111', color: '#fff', padding: '16px 24px', borderRadius: 4, marginBottom: 32, display: 'flex', gap: 32, flexWrap: 'wrap' }}>
          {[
            { label: 'Units', value: num(p?.unit_count) },
            { label: 'Year Built', value: plain(p?.year_built) },
            { label: 'Bldg SF', value: p?.gross_sf ? Number(p.gross_sf).toLocaleString() + ' SF' : '—' },
            { label: 'Price', value: compactDollars(headlinePrice) },
            { label: '$/Unit', value: compactDollars(listing.price_per_unit) },
            { label: '$/SF', value: dollars(listing.price_per_sf) },
            { label: 'CAP', value: listing.cap_rate_current != null ? listing.cap_rate_current + '%' : '—' },
            { label: 'GRM', value: plain(listing.grm_current) },
            { label: 'Class', value: plain(p?.property_class) },
          ].map(({ label, value }) => (
            <div key={label}>
              <div style={{ fontSize: 10, letterSpacing: 2, textTransform: 'uppercase', color: '#9A6B3F', marginBottom: 4 }}>{label}</div>
              <div style={{ fontSize: 16, fontWeight: 600 }}>{value}</div>
            </div>
          ))}
        </div>

        {/* Pending OM banner */}
        <PendingOMBanner lastOMParsedAt={listing.last_om_parsed_at} />

        {/* Sale Highlights */}
        {p?.sale_highlights && (
          <Section title="Sale Highlights">
            <div style={{ fontSize: 14, color: '#444', lineHeight: 1.7, whiteSpace: 'pre-wrap' }}>{p.sale_highlights}</div>
          </Section>
        )}

        {/* Sale & Yield */}
        <Grid>
          <Section title="Sale">
            <Field label="Status" value={plain(listing.status)} />
            <Field label="List Price" value={dollars(listing.list_price)} />
            <Field label="Sale Price" value={dollars(listing.sale_price)} />
            <Field label="Bid/Ask Delta" value={dollars(listing.bid_ask_delta)} hint="derived" />
            <Field label="Sale Date" value={date(listing.sale_date)} />
            <Field label="List Date" value={date(listing.list_date)} />
            <Field label="Sale Type" value={plain(listing.sale_type)} />
            <Field label="Price / Unit" value={dollars(listing.price_per_unit)} />
            <Field label="Price / SF" value={dollars(listing.price_per_sf)} />
          </Section>

          <Section title="Yield (Current vs Market)">
            <Field label="CAP Current" value={pct(listing.cap_rate_current)} />
            <Field label="CAP Market" value={pct(listing.cap_rate_market)} hint={listing.cap_rate_market == null ? 'om-pending' : undefined} />
            <Field label="GRM Current" value={plain(listing.grm_current)} />
            <Field label="GRM Market" value={plain(listing.grm_market)} hint={listing.grm_market == null ? 'om-pending' : undefined} />
            <Field label="NOI" value={dollars(listing.noi_current)} />
            <Field label="Implied Gross Annual" value={dollars(listing.implied_gross_annual_current)} hint="derived" />
            <Field label="Implied Monthly Rent / Unit" value={dollars(listing.implied_monthly_rent_current)} hint="derived" />
            <Field label="Expense Ratio" value={pct(listing.expense_ratio)} hint={listing.expense_ratio == null ? 'om-pending' : undefined} />
          </Section>
        </Grid>

        {/* Regulatory */}
        <Section title="Regulatory">
          <Grid>
            <div>
              <Field label="RSO Applicable" value={plain(listing.rso_applicable)} hint="derived from year built" />
              <Field label="AB 1482 Applicable" value={plain(listing.ab1482_applicable)} hint="derived" />
            </div>
            <div>
              <Field label="ULA Threshold" value={plain(listing.ula_threshold_status)} hint="derived" />
              <Field label="ULA Tax Estimate" value={dollars(listing.ula_tax_estimate)} hint="derived" />
            </div>
          </Grid>
        </Section>

        {/* Building & Land */}
        <Grid>
          <Section title="Building">
            <Field label="Property Type" value={plain(p?.property_type)} />
            <Field label="Class" value={plain(p?.property_class)} />
            <Field label="Star Rating" value={plain(p?.star_rating)} />
            <Field label="Units" value={plain(p?.unit_count)} />
            <Field label="Avg Unit Size" value={p?.avg_unit_sf ? p.avg_unit_sf + ' SF' : '—'} />
            <Field label="Stories" value={plain(p?.stories)} />
            <Field label="Bldg SF" value={p?.gross_sf ? Number(p.gross_sf).toLocaleString() + ' SF' : '—'} />
            <Field label="Typical Floor" value={p?.typical_floor_sf ? Number(p.typical_floor_sf).toLocaleString() + ' SF' : '—'} />
            <Field label="# Buildings" value={plain(p?.building_count)} />
            <Field label="Year Built" value={plain(p?.year_built)} />
            <Field label="Year Renovated" value={plain(p?.year_renovated)} />
            <Field label="Construction" value={plain(p?.construction_type)} />
            <Field label="Architectural Notes" value={plain(p?.architectural_notes)} hint={p?.architectural_notes ? undefined : 'om-pending'} />
            <Field label="Elevators" value={plain(p?.elevators)} />
            <Field label="Walk Up" value={plain(p?.walk_up)} />
            <Field label="Soft Story Retrofit" value={plain(p?.soft_story_retrofit)} />
          </Section>

          <Section title="Land & Parking">
            <Field label="Land Acres" value={p?.land_acres ? p.land_acres + ' AC' : '—'} />
            <Field label="Lot SF" value={p?.lot_sf ? Number(p.lot_sf).toLocaleString() + ' SF' : '—'} />
            <Field label="Building FAR" value={plain(p?.bldg_far)} />
            <Field label="Zoning" value={plain(p?.zoning)} />
            <Field label="APN / Parcel" value={plain(p?.apn)} />
            <Field label="Parking Type" value={plain(p?.parking_type)} />
            <Field label="Parking Count" value={plain(p?.parking_count)} />
            <Field label="Units / Acre" value={plain(p?.units_per_acre)} />
          </Section>
        </Grid>

        {/* Walk & Transit */}
        <Section title="Walk & Transit Scores">
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '0 48px' }}>
            <Field label="Pedestrian" value={plain(p?.pedestrian_score)} />
            <Field label="Cycling" value={plain(p?.cycling_score)} />
            <Field label="Car" value={plain(p?.car_score)} />
            <Field label="Transit" value={plain(p?.transit_score)} />
            <Field label="Walk Score" value={plain(p?.walk_score)} />
            <Field label="Bike Score" value={plain(p?.bike_score)} />
          </div>
        </Section>

        {/* Unit Mix */}
        {unitMix && unitMix.length > 0 && (
          <Section title={`Unit Mix${listing.unit_mix_updated ? ` — Updated ${date(listing.unit_mix_updated)}` : ''}`}>
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

        {/* Market Conditions */}
        {(p?.vacancy_rate_subject != null || p?.market_rent_subject != null) && (
          <Section title="Market Conditions">
            <DataTable
              headers={['', 'Subject', 'Submarket', 'Market']}
              rows={[
                ['Vacancy', pct(p?.vacancy_rate_subject), pct(p?.vacancy_rate_submarket), pct(p?.vacancy_rate_market)],
                ['Market Rent / Unit', dollars(p?.market_rent_subject), dollars(p?.market_rent_submarket), dollars(p?.market_rent_market)],
                ['Concessions', pct(p?.concessions_subject), pct(p?.concessions_submarket), pct(p?.concessions_market)],
              ]}
            />
          </Section>
        )}

        {/* Sale History */}
        {saleHistory && saleHistory.length > 0 && (
          <Section title="Sale History">
            <DataTable
              headers={['Date', 'Type', 'Price', '$ / Unit', 'CAP', 'Buyer', 'Seller']}
              rows={saleHistory.map(r => [
                r.date ?? '—',
                r.type ?? '—',
                dollars(r.price ?? null),
                dollars(r.price_per_unit ?? null),
                pct(r.cap_rate ?? null),
                r.buyer ?? '—',
                r.seller ?? '—',
              ])}
            />
          </Section>
        )}

        {/* Loan & Ownership */}
        <Grid>
          <Section title="Loan">
            <Field label="Origination Amount" value={dollars(listing.loan_amount)} />
            <Field label="Origination Date" value={date(listing.loan_origination_date)} />
            <Field label="Maturity Date" value={date(listing.loan_maturity_date)} />
            <Field label="Lender" value={plain(listing.lender)} />
            <Field label="Borrower" value={plain(listing.borrower)} />
            <Field label="Loan Type" value={plain(listing.loan_type)} />
            <Field label="Doc Number" value={plain(listing.loan_doc_number)} />
          </Section>

          <Section title="Ownership & Management">
            <Field label="Recorded Owner" value={plain(p?.recorded_owner)} />
            <Field label="True Owner" value={plain(p?.true_owner)} />
            <Field label="Owner Type" value={plain(p?.owner_type)} />
            <Field label="Property Manager" value={plain(p?.property_manager)} />
            <Field label="Manager Phone" value={plain(p?.pm_phone)} />
            <Field label="Manager Since" value={plain(p?.pm_since)} />
          </Section>
        </Grid>

        {/* Brokers */}
        <Grid>
          <Section title="Listing Broker">
            <Field label="Name" value={plain(lb?.name)} />
            <Field label="Title" value={plain(lb?.title)} hint={lb?.title ? undefined : 'om-pending'} />
            <Field label="Firm" value={plain(lb?.firm)} />
            <Field label="Team" value={plain(lb?.team)} hint={lb?.team ? undefined : 'om-pending'} />
            <Field label="Phone" value={plain(lb?.phone)} />
            <Field label="Cell" value={plain(lb?.cell)} hint={lb?.cell ? undefined : 'om-pending'} />
            <Field label="Email" value={plain(lb?.email)} />
            <Field label="DRE License" value={plain(lb?.dre_license)} />
            <Field label="Office Address" value={plain(lb?.office_address)} hint={lb?.office_address ? undefined : 'om-pending'} />
          </Section>

          <Section title="Buyer Broker">
            {bb ? (
              <>
                <Field label="Name" value={plain(bb.name)} />
                <Field label="Firm" value={plain(bb.firm)} />
                <Field label="Phone" value={plain(bb.phone)} />
                <Field label="Email" value={plain(bb.email)} />
                <Field label="DRE License" value={plain(bb.dre_license)} />
              </>
            ) : (
              <PendingOMNote text="Buyer broker captured from broker OM PDF when available." />
            )}
          </Section>
        </Grid>

        {/* OM-only sections — pending */}
        <Section title="Photos">
          <PendingOMNote text="Listing photos with attribution captured from broker OM PDF (Phase 1.5)." />
        </Section>
        <Section title="Marketing Quotes">
          <PendingOMNote text="Verbatim broker pitch language captured from broker OM PDF." />
        </Section>
        <Section title="Rent Roll">
          <PendingOMNote text="Per-unit current rent captured from broker OM PDF when present." />
        </Section>
        <Section title="In-Unit Features">
          <PendingOMNote text='Per-unit feature notes (e.g., "balconies select units") captured from broker OM PDF.' />
        </Section>

        {/* Public Record + FEMA */}
        <Grid>
          <Section title={`Public Record${p?.assessment_year ? ` — ${p.assessment_year}` : ''}`}>
            <Field label="Total Assessed" value={dollars(p?.assessed_total)} />
            <Field label="Improvements" value={dollars(p?.assessed_improvements)} />
            <Field label="Land" value={dollars(p?.assessed_land)} />
            <Field label="Annual Tax" value={dollars(p?.annual_tax)} />
            <Field label="Tax / Unit" value={dollars(p?.tax_per_unit)} />
            <Field label="Tax Year" value={plain(p?.tax_year)} />
          </Section>

          <Section title="Flood Risk">
            <Field label="Flood Risk Area" value={plain(p?.flood_risk_area)} />
            <Field label="FEMA Flood Zone" value={plain(p?.flood_zone)} />
            <Field label="In SFHA" value={plain(p?.in_sfha)} />
            <Field label="FEMA Map ID" value={plain(p?.fema_map_id)} />
            <Field label="FEMA Map Date" value={plain(p?.fema_map_date)} />
          </Section>
        </Grid>

        {/* Demographics */}
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

        {/* Location */}
        <Section title="Location">
          <Grid>
            <div>
              <Field label="Street Address" value={plain(p?.street_address)} />
              <Field label="City" value={plain(p?.city)} />
              <Field label="State" value={plain(p?.state)} />
              <Field label="ZIP" value={plain(p?.zip)} />
              <Field label="County" value={plain(p?.county)} />
            </div>
            <div>
              <Field label="Market" value={plain(p?.market)} />
              <Field label="Submarket" value={plain(p?.submarket)} />
              <Field label="Submarket Cluster" value={plain(p?.submarket_cluster)} />
              <Field label="Neighborhood" value={plain(p?.neighborhood)} />
              <Field label="CBSA" value={plain(p?.cbsa)} />
              <Field label="DMA" value={plain(p?.dma)} />
            </div>
          </Grid>
        </Section>

        {/* Transit */}
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

        {/* Airports */}
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

        {/* Amenities */}
        {p?.amenities && p.amenities.length > 0 && (
          <Section title="Amenities">
            <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
              {p.amenities.map((a, i) => (
                <span key={i} style={{ padding: '4px 12px', background: '#f0f0f0', borderRadius: 2, fontSize: 12 }}>{a}</span>
              ))}
            </div>
          </Section>
        )}

        {/* Building Notes */}
        {p?.building_notes && (
          <Section title="Building Notes">
            <div style={{ fontSize: 14, color: '#444', lineHeight: 1.7, whiteSpace: 'pre-wrap' }}>{p.building_notes}</div>
          </Section>
        )}

        {p?.value_add_notes && (
          <Section title="Value Add Notes">
            <div style={{ fontSize: 14, color: '#444', lineHeight: 1.6 }}>{p.value_add_notes}</div>
          </Section>
        )}

        {p?.capital_improvements && (
          <Section title="Capital Improvements">
            <div style={{ fontSize: 14, color: '#444', lineHeight: 1.6 }}>{p.capital_improvements}</div>
          </Section>
        )}

        {p?.costar_property_id && (
          <div style={{ fontSize: 11, color: '#999', marginTop: 32, textAlign: 'right' }}>CoStar Property ID: {p.costar_property_id}</div>
        )}
      </div>
    </PageShell>
  )
}

// ============================================================
// shared components
// ============================================================

function PageShell({ children }: { children: React.ReactNode }) {
  return (
    <div style={{ background: '#FAFAF8', minHeight: '100vh', fontFamily: '-apple-system, BlinkMacSystemFont, sans-serif' }}>
      <div style={{ borderBottom: '1px solid #ddd', padding: '16px 32px', background: '#fff', display: 'flex', alignItems: 'baseline', gap: 24 }}>
        <Link href="/listings" style={{ fontFamily: 'Georgia, serif', fontSize: 20, fontStyle: 'italic', color: '#111', textDecoration: 'none' }}>
          Atlas <em>Brief</em>
        </Link>
        <Link href="/listings" style={{ fontSize: 11, letterSpacing: 2, textTransform: 'uppercase', color: '#666', textDecoration: 'none' }}>The Tape</Link>
        <Link href="/dashboard" style={{ fontSize: 11, letterSpacing: 2, textTransform: 'uppercase', color: '#666', textDecoration: 'none' }}>Parse</Link>
      </div>
      {children}
    </div>
  )
}

function BreadcrumbBack() {
  return (
    <div style={{ marginBottom: 16 }}>
      <Link href="/listings" style={{ fontSize: 11, letterSpacing: 2, textTransform: 'uppercase', color: '#9A6B3F', textDecoration: 'none' }}>← The Tape</Link>
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
  const isDerived = hint === 'derived'
  const empty = value === '—'
  return (
    <div style={{ borderBottom: '1px solid #eee', paddingBottom: 10, marginBottom: 10 }}>
      <div style={{ fontSize: 10, letterSpacing: 2, textTransform: 'uppercase', color: '#9A6B3F', marginBottom: 4, display: 'flex', alignItems: 'center', gap: 8 }}>
        <span>{label}</span>
        {isDerived && <span style={{ fontSize: 9, color: '#aaa', textTransform: 'lowercase', letterSpacing: 1 }}>(derived)</span>}
        {isOMPending && empty && <span style={{ fontSize: 9, color: '#c08c2a', textTransform: 'lowercase', letterSpacing: 1, fontStyle: 'italic' }}>(om pending)</span>}
        {hint && hint !== 'om-pending' && hint !== 'derived' && <span style={{ fontSize: 9, color: '#aaa', textTransform: 'lowercase', letterSpacing: 1 }}>({hint})</span>}
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

function StatusPill({ status }: { status: string | null }) {
  if (!status) return <span style={{ color: '#bbb' }}>—</span>
  const bg = status === 'sold' ? '#c0392b' : status === 'for_sale' ? '#27ae60' : '#7f8c8d'
  const label = status === 'sold' ? 'Sold' : status === 'for_sale' ? 'For Sale' : 'Off Market'
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

function PendingOMNote({ text }: { text: string }) {
  return (
    <div style={{ padding: 16, background: '#FFF8E7', border: '1px dashed #c08c2a', borderRadius: 4, fontSize: 13, color: '#8B6914' }}>
      <div style={{ fontSize: 10, letterSpacing: 2, textTransform: 'uppercase', color: '#c08c2a', marginBottom: 4 }}>OM Pending</div>
      {text}
    </div>
  )
}

function PendingOMBanner({ lastOMParsedAt }: { lastOMParsedAt: string | null }) {
  if (lastOMParsedAt) return null
  return (
    <div style={{ marginBottom: 24, padding: 16, background: '#FFF8E7', border: '1px solid #e8d49a', borderRadius: 4, fontSize: 13, color: '#8B6914' }}>
      <div style={{ fontSize: 10, letterSpacing: 2, textTransform: 'uppercase', color: '#c08c2a', marginBottom: 4 }}>Phase 1.5 Pending</div>
      Some fields below require parsing the broker OM PDF (photos, marketing quotes, rent roll, in-unit features, buyer broker, current/market CAP+GRM split). Coming in the next phase.
    </div>
  )
}

function ErrorBlock({ message }: { message: string }) {
  return (
    <div style={{ maxWidth: 600, margin: '40px auto', padding: 24, background: '#fee', border: '1px solid #fcc', borderRadius: 4, color: '#c0392b', fontSize: 13 }}>
      Error: {message}
    </div>
  )
}
