'use client'

import { useState } from 'react'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/client'
import { useRouter } from 'next/navigation'
import SignOutButton from '@/app/SignOutButton'

type SaleHistoryRow = {
  date: string | null
  type: string | null
  price: number | null
  units: number | null
  price_per_unit: number | null
  cap_rate: number | null
  buyer: string | null
  seller: string | null
}

type UnitMixRow = {
  bed_type: string | null
  units: number | null
  avg_sf: number | null
  asking_rent_per_unit: number | null
  asking_rent_per_sf: number | null
  concessions_pct: number | null
}

type Demographics = {
  population: number | null
  households: number | null
  median_age: number | null
  median_hh_income: number | null
  daytime_employees: number | null
  population_growth_5y: number | null
  household_growth_5y: number | null
} | null

type TransitRow = { name: string | null; type: string | null; drive_min: number | null; walk_min: number | null; distance_mi: number | null }
type AirportRow = { name: string | null; drive_min: number | null; distance_mi: number | null }

type Deal = {
  property_id: string | null
  property_name: string | null
  address: string | null
  city: string | null
  state: string | null
  zip: string | null
  county: string | null
  market: string | null
  submarket: string | null
  submarket_cluster: string | null
  cbsa: string | null
  dma: string | null
  location_type: string | null
  neighborhood: string | null

  star_rating: number | null
  property_class: 'A' | 'B' | 'C' | null
  property_type: string | null

  unit_count: number | null
  building_sf: number | null
  avg_unit_size_sf: number | null
  stories: number | null
  typical_floor_sf: number | null
  building_count: number | null
  units_per_acre: number | null
  year_built: number | null
  year_renovated: number | null
  construction: string | null
  elevators: string | null
  walk_up: boolean | null
  metering: string | null
  market_segment: string | null
  rent_type: string | null

  land_acres: number | null
  land_sf: number | null
  bldg_far: number | null
  zoning: string | null
  apn: string | null

  status: 'for_sale' | 'sold' | 'off_market' | null
  list_price: number | null
  sale_price: number | null
  price_per_unit: number | null
  price_per_sf: number | null
  cap_rate: number | null
  noi: number | null
  grm: number | null
  sale_type: string | null
  sale_date: string | null
  last_sale_date: string | null
  last_sale_price: number | null

  sale_history: SaleHistoryRow[] | null

  unit_mix: UnitMixRow[] | null
  asking_rent_per_unit: number | null
  asking_rent_per_sf: number | null
  unit_mix_updated: string | null

  vacancy_rate_subject: number | null
  vacancy_rate_submarket: number | null
  vacancy_rate_market: number | null
  market_rent_subject: number | null
  market_rent_submarket: number | null
  market_rent_market: number | null
  concessions_subject: number | null
  concessions_submarket: number | null
  concessions_market: number | null
  under_construction_units_market: number | null
  twelve_mo_sales_volume_submarket: number | null
  market_sales_price_per_unit: number | null

  pedestrian_score: number | null
  cycling_score: number | null
  car_score: number | null
  transit_score: number | null
  walk_score: number | null
  bike_score: number | null

  parking_spaces: string | null
  parking_count: number | null

  loan_amount: number | null
  loan_origination_date: string | null
  loan_maturity_date: string | null
  lender: string | null
  borrower: string | null
  loan_type: string | null
  loan_doc_number: string | null

  recorded_owner: string | null
  true_owner: string | null
  owner_type: string | null
  property_manager: string | null
  property_manager_phone: string | null
  property_manager_since: string | null

  sale_broker: string | null
  broker_name: string | null
  broker_firm: string | null
  broker_phone: string | null
  broker_email: string | null
  broker_license: string | null
  mls_number: string | null

  assessed_total: number | null
  assessed_improvements: number | null
  assessed_land: number | null
  assessment_year: number | null
  annual_tax: number | null
  tax_per_unit: number | null
  tax_year: number | null

  flood_risk_area: string | null
  flood_zone: string | null
  in_sfha: boolean | null
  fema_map_id: string | null
  fema_map_date: string | null

  demographics_1mi: Demographics
  demographics_3mi: Demographics

  sale_highlights: string | null
  building_notes: string | null
  amenities: string[] | null
  value_add_notes: string | null
  capital_improvements: string | null
  soft_story_retrofit: boolean | null

  transit_stations: TransitRow[] | null
  airports: AirportRow[] | null
}

function dollars(n: number | null | undefined) {
  if (n == null) return '—'
  return '$' + n.toLocaleString()
}
function compactDollars(n: number | null | undefined) {
  if (n == null) return '—'
  if (n >= 1_000_000) return '$' + (n / 1_000_000).toFixed(2) + 'M'
  if (n >= 1_000) return '$' + (n / 1_000).toFixed(1) + 'K'
  return '$' + n.toLocaleString()
}
function pct(n: number | null | undefined) {
  if (n == null) return '—'
  return n + '%'
}
function num(n: number | null | undefined) {
  if (n == null) return '—'
  return n.toLocaleString()
}

function Field({ label, value }: { label: string; value: string | number | boolean | null | undefined }) {
  const display = value == null || value === '' ? '—' : value === true ? 'Yes' : value === false ? 'No' : String(value)
  return (
    <div style={{ borderBottom: '1px solid #eee', paddingBottom: 10, marginBottom: 10 }}>
      <div style={{ fontSize: 10, letterSpacing: 2, textTransform: 'uppercase', color: '#9A6B3F', marginBottom: 4 }}>{label}</div>
      <div style={{ fontSize: 14, color: display === '—' ? '#bbb' : '#111' }}>{display}</div>
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

function Stars({ n }: { n: number | null }) {
  if (n == null) return null
  return (
    <span style={{ color: '#9A6B3F', letterSpacing: 2 }}>
      {'★'.repeat(Math.floor(n))}
      {'☆'.repeat(Math.max(0, 5 - Math.floor(n)))}
    </span>
  )
}

export default function DashboardPage() {
  const [mode, setMode] = useState<'text' | 'pdf' | 'om'>('text')
  const [text, setText] = useState('')
  const [pdfFile, setPdfFile] = useState<File | null>(null)
  const [omFile, setOmFile] = useState<File | null>(null)
  const [deal, setDeal] = useState<Deal | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [warning, setWarning] = useState('')
  const router = useRouter()
  const supabase = createClient()

  async function handleSignOut() {
    await supabase.auth.signOut()
    router.push('/login')
  }

  async function handleParse() {
    setLoading(true)
    setError('')
    setWarning('')
    setDeal(null)
    try {
      let res: Response
      if (mode === 'om' && omFile) {
        // Upload to Supabase Storage first to bypass Vercel's 4.5MB body limit
        const { data: { user } } = await supabase.auth.getUser()
        if (!user) {
          setError('Not signed in')
          return
        }
        const safeName = omFile.name.replace(/[^a-zA-Z0-9._-]/g, '_')
        const path = `${user.id}/${Date.now()}-${safeName}`
        const { error: uploadError } = await supabase.storage
          .from('om-uploads')
          .upload(path, omFile, { contentType: 'application/pdf', upsert: false })
        if (uploadError) {
          setError(`Upload failed: ${uploadError.message}`)
          return
        }
        res = await fetch('/api/parse-om', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ path, file_name: omFile.name, file_size: omFile.size }),
        })
      } else if (mode === 'pdf' && pdfFile) {
        const formData = new FormData()
        formData.append('pdf', pdfFile)
        res = await fetch('/api/parse', { method: 'POST', body: formData })
      } else if (mode === 'text') {
        if (!text.trim()) return
        res = await fetch('/api/parse', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ text }),
        })
      } else {
        return
      }
      const data = await res.json()
      // OM parse returns listing_id (snake_case); CoStar returns listingId
      const listingId = data.listing_id ?? data.listingId
      if (listingId) {
        if (data.existing_listings_for_property && data.existing_listings_for_property > 1) {
          setWarning(
            `This property already has ${data.existing_listings_for_property - 1} other listing(s). New listing created — open the Database to review.`
          )
        }
        router.push(`/listings/${listingId}`)
        return
      }
      if (data.error) {
        setError(data.error)
        if (data.deal) setDeal(data.deal)
      } else {
        setDeal(data.deal)
      }
    } catch {
      setError('Something went wrong. Try again.')
    } finally {
      setLoading(false)
    }
  }

  const canParse =
    mode === 'om' ? !!omFile :
    mode === 'pdf' ? !!pdfFile :
    !!text.trim()
  const headlinePrice = deal?.list_price || deal?.sale_price

  return (
    <div style={{ background: '#FAFAF8', minHeight: '100vh', fontFamily: '-apple-system, BlinkMacSystemFont, sans-serif' }}>
      <div style={{ borderBottom: '1px solid #ddd', padding: '16px 32px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', background: '#fff' }}>
        <div style={{ display: 'flex', alignItems: 'baseline', gap: 24 }}>
          <Link href="/listings" style={{ fontFamily: 'Georgia, serif', fontSize: 20, fontStyle: 'italic', color: '#111', textDecoration: 'none' }}>Atlas <em>Brief</em></Link>
          <Link href="/listings" style={{ fontSize: 11, letterSpacing: 2, textTransform: 'uppercase', color: '#666', textDecoration: 'none' }}>Database</Link>
          <Link href="/explore" style={{ fontSize: 11, letterSpacing: 2, textTransform: 'uppercase', color: '#666', textDecoration: 'none' }}>Explore</Link>
          <Link href="/dashboard" style={{ fontSize: 11, letterSpacing: 2, textTransform: 'uppercase', color: '#111', textDecoration: 'none', borderBottom: '2px solid #111', paddingBottom: 2 }}>Input</Link>
        </div>
        <SignOutButton />
      </div>

      <div style={{ maxWidth: 1100, margin: '0 auto', padding: '40px 24px' }}>

        {/* Input */}
        <div style={{ marginBottom: 32 }}>
          <div style={{ display: 'flex', gap: 0, marginBottom: 16, borderBottom: '1px solid #ddd' }}>
            {(['text', 'pdf', 'om'] as const).map(m => (
              <button
                key={m}
                onClick={() => setMode(m)}
                style={{
                  padding: '8px 20px',
                  fontSize: 11,
                  letterSpacing: 2,
                  textTransform: 'uppercase',
                  background: 'none',
                  border: 'none',
                  borderBottom: mode === m ? '2px solid #111' : '2px solid transparent',
                  color: mode === m ? '#111' : '#999',
                  cursor: 'pointer',
                  marginBottom: -1,
                }}
              >
                {m === 'text' ? 'CoStar Text' : m === 'pdf' ? 'CoStar PDF' : 'Broker OM PDF'}
              </button>
            ))}
          </div>

          {mode === 'pdf' ? (
            <div
              onClick={() => document.getElementById('pdf-input')?.click()}
              style={{
                border: '2px dashed #ddd',
                borderRadius: 4,
                padding: '40px 24px',
                textAlign: 'center',
                cursor: 'pointer',
                background: pdfFile ? '#f9f9f9' : '#fff',
              }}
            >
              <input
                id="pdf-input"
                type="file"
                accept="application/pdf"
                style={{ display: 'none' }}
                onChange={e => setPdfFile(e.target.files?.[0] ?? null)}
              />
              {pdfFile ? (
                <div>
                  <div style={{ fontSize: 13, color: '#111', marginBottom: 4 }}>{pdfFile.name}</div>
                  <div style={{ fontSize: 11, color: '#999' }}>{(pdfFile.size / 1024).toFixed(0)} KB — click to replace</div>
                </div>
              ) : (
                <div style={{ fontSize: 14, color: '#666' }}>Drop CoStar PDF report here</div>
              )}
            </div>
          ) : mode === 'om' ? (
            <div
              onClick={() => document.getElementById('om-input')?.click()}
              style={{
                border: '2px dashed #ddd',
                borderRadius: 4,
                padding: '40px 24px',
                textAlign: 'center',
                cursor: 'pointer',
                background: omFile ? '#f9f9f9' : '#fff',
              }}
            >
              <input
                id="om-input"
                type="file"
                accept="application/pdf"
                style={{ display: 'none' }}
                onChange={e => setOmFile(e.target.files?.[0] ?? null)}
              />
              {omFile ? (
                <div>
                  <div style={{ fontSize: 13, color: '#111', marginBottom: 4 }}>{omFile.name}</div>
                  <div style={{ fontSize: 11, color: '#999' }}>{(omFile.size / 1024).toFixed(0)} KB — click to replace</div>
                </div>
              ) : (
                <div style={{ fontSize: 14, color: '#666' }}>Drop broker Offering Memorandum here</div>
              )}
            </div>
          ) : (
            <textarea
              value={text}
              onChange={e => setText(e.target.value)}
              placeholder="Paste a CoStar Property Summary or Sales Comp page here. The parser detects which format and extracts both for-sale and sold-deal fields."
              rows={14}
              style={{ width: '100%', padding: 16, border: '1px solid #ddd', borderRadius: 4, fontSize: 14, background: '#fff', color: '#111', resize: 'vertical', outline: 'none', fontFamily: 'inherit', boxSizing: 'border-box' }}
            />
          )}

          <button
            onClick={handleParse}
            disabled={loading || !canParse}
            style={{ marginTop: 12, padding: '12px 28px', background: '#111', color: '#fff', border: 'none', borderRadius: 4, fontSize: 14, cursor: loading || !canParse ? 'not-allowed' : 'pointer', opacity: loading || !canParse ? 0.6 : 1 }}
          >
            {loading ? 'Parsing...' : 'Parse Deal'}
          </button>
          {error && <div style={{ marginTop: 12, color: '#c0392b', fontSize: 13 }}>{error}</div>}
          {warning && <div style={{ marginTop: 12, color: '#8B6914', fontSize: 13 }}>{warning}</div>}
        </div>

        {deal && (
          <div>
            {/* Header */}
            <div style={{ marginBottom: 24, display: 'flex', alignItems: 'center', gap: 12, flexWrap: 'wrap' }}>
              {deal.status && (
                <span style={{
                  padding: '4px 12px',
                  borderRadius: 2,
                  fontSize: 11,
                  fontWeight: 700,
                  letterSpacing: 2,
                  textTransform: 'uppercase',
                  background: deal.status === 'sold' ? '#c0392b' : deal.status === 'for_sale' ? '#27ae60' : '#7f8c8d',
                  color: '#fff'
                }}>
                  {deal.status === 'sold' ? 'Sold' : deal.status === 'for_sale' ? 'For Sale' : 'Off Market'}
                </span>
              )}
              <div style={{ fontFamily: 'Georgia, serif', fontSize: 24, color: '#111' }}>
                {deal.property_name || deal.address || 'Unknown Property'}
              </div>
              <Stars n={deal.star_rating} />
            </div>
            {(deal.address && deal.property_name) && (
              <div style={{ fontSize: 14, color: '#666', marginBottom: 16, marginTop: -16 }}>
                {deal.address}{deal.city ? ` · ${deal.city}` : ''}{deal.state ? `, ${deal.state}` : ''}{deal.zip ? ` ${deal.zip}` : ''}{deal.submarket ? ` · ${deal.submarket}` : ''}
              </div>
            )}

            {/* Stats bar */}
            <div style={{ background: '#111', color: '#fff', padding: '16px 24px', borderRadius: 4, marginBottom: 32, display: 'flex', gap: 32, flexWrap: 'wrap' }}>
              {[
                { label: 'Units', value: deal.unit_count },
                { label: 'Year Built', value: deal.year_built },
                { label: 'GBA', value: deal.building_sf ? deal.building_sf.toLocaleString() + ' SF' : null },
                { label: 'Price', value: compactDollars(headlinePrice) },
                { label: '$/Unit', value: compactDollars(deal.price_per_unit) },
                { label: '$/SF', value: dollars(deal.price_per_sf) },
                { label: 'Cap Rate', value: deal.cap_rate ? deal.cap_rate + '%' : null },
                { label: 'NOI', value: compactDollars(deal.noi) },
                { label: 'Class', value: deal.property_class },
              ].map(({ label, value }) => (
                <div key={label}>
                  <div style={{ fontSize: 10, letterSpacing: 2, textTransform: 'uppercase', color: '#9A6B3F', marginBottom: 4 }}>{label}</div>
                  <div style={{ fontSize: 16, fontWeight: 600 }}>{value ?? '—'}</div>
                </div>
              ))}
            </div>

            {/* Sale Highlights */}
            {deal.sale_highlights && (
              <Section title="Sale Highlights">
                <div style={{ fontSize: 14, color: '#444', lineHeight: 1.7, whiteSpace: 'pre-wrap' }}>{deal.sale_highlights}</div>
              </Section>
            )}

            {/* Sale & Building */}
            <Grid>
              <Section title="Sale">
                <Field label="Status" value={deal.status} />
                <Field label="List Price" value={dollars(deal.list_price)} />
                <Field label="Sale Price" value={dollars(deal.sale_price)} />
                <Field label="Price / Unit" value={dollars(deal.price_per_unit)} />
                <Field label="Price / SF" value={dollars(deal.price_per_sf)} />
                <Field label="Cap Rate" value={pct(deal.cap_rate)} />
                <Field label="NOI" value={dollars(deal.noi)} />
                <Field label="GRM" value={deal.grm} />
                <Field label="Sale Type" value={deal.sale_type} />
                <Field label="Sale Date" value={deal.sale_date} />
                <Field label="Last Sale Date" value={deal.last_sale_date} />
                <Field label="Last Sale Price" value={dollars(deal.last_sale_price)} />
              </Section>

              <Section title="Building">
                <Field label="Property Type" value={deal.property_type} />
                <Field label="Class" value={deal.property_class} />
                <Field label="Star Rating" value={deal.star_rating} />
                <Field label="Units" value={deal.unit_count} />
                <Field label="Avg Unit Size" value={deal.avg_unit_size_sf ? deal.avg_unit_size_sf + ' SF' : null} />
                <Field label="Stories" value={deal.stories} />
                <Field label="GBA" value={deal.building_sf ? deal.building_sf.toLocaleString() + ' SF' : null} />
                <Field label="Typical Floor" value={deal.typical_floor_sf ? deal.typical_floor_sf.toLocaleString() + ' SF' : null} />
                <Field label="# of Buildings" value={deal.building_count} />
                <Field label="Units / Acre" value={deal.units_per_acre} />
                <Field label="Year Built" value={deal.year_built} />
                <Field label="Year Renovated" value={deal.year_renovated} />
                <Field label="Construction" value={deal.construction} />
                <Field label="Elevators" value={deal.elevators} />
                <Field label="Walk Up" value={deal.walk_up} />
                <Field label="Metering" value={deal.metering} />
                <Field label="Soft Story Retrofit" value={deal.soft_story_retrofit} />
              </Section>
            </Grid>

            <Grid>
              <Section title="Land">
                <Field label="Land Acres" value={deal.land_acres ? deal.land_acres + ' AC' : null} />
                <Field label="Land SF" value={deal.land_sf ? deal.land_sf.toLocaleString() + ' SF' : null} />
                <Field label="Building FAR" value={deal.bldg_far} />
                <Field label="Zoning" value={deal.zoning} />
                <Field label="APN / Parcel" value={deal.apn} />
                <Field label="Parking Spaces" value={deal.parking_spaces} />
                <Field label="Parking Count" value={deal.parking_count} />
              </Section>

              <Section title="Walk & Transit Scores">
                <Field label="Pedestrian" value={deal.pedestrian_score} />
                <Field label="Cycling" value={deal.cycling_score} />
                <Field label="Car" value={deal.car_score} />
                <Field label="Transit" value={deal.transit_score} />
                <Field label="Walk Score" value={deal.walk_score} />
                <Field label="Bike Score" value={deal.bike_score} />
              </Section>
            </Grid>

            {/* Unit Mix */}
            {deal.unit_mix && deal.unit_mix.length > 0 && (
              <Section title={`Unit Mix${deal.unit_mix_updated ? ` — Updated ${deal.unit_mix_updated}` : ''}`}>
                <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
                  <thead>
                    <tr style={{ borderBottom: '1px solid #ddd', color: '#9A6B3F', fontSize: 10, textTransform: 'uppercase', letterSpacing: 2 }}>
                      <th style={{ textAlign: 'left', padding: '8px 0' }}>Bed</th>
                      <th style={{ textAlign: 'right' }}>Units</th>
                      <th style={{ textAlign: 'right' }}>Avg SF</th>
                      <th style={{ textAlign: 'right' }}>Rent / Unit</th>
                      <th style={{ textAlign: 'right' }}>Rent / SF</th>
                      <th style={{ textAlign: 'right' }}>Concessions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {deal.unit_mix.map((row, i) => (
                      <tr key={i} style={{ borderBottom: '1px solid #f0f0f0' }}>
                        <td style={{ padding: '10px 0' }}>{row.bed_type ?? '—'}</td>
                        <td style={{ textAlign: 'right' }}>{num(row.units)}</td>
                        <td style={{ textAlign: 'right' }}>{num(row.avg_sf)}</td>
                        <td style={{ textAlign: 'right' }}>{dollars(row.asking_rent_per_unit)}</td>
                        <td style={{ textAlign: 'right' }}>{dollars(row.asking_rent_per_sf)}</td>
                        <td style={{ textAlign: 'right' }}>{pct(row.concessions_pct)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </Section>
            )}

            {/* Market Conditions */}
            {(deal.vacancy_rate_subject != null || deal.market_rent_subject != null) && (
              <Section title="Market Conditions">
                <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
                  <thead>
                    <tr style={{ borderBottom: '1px solid #ddd', color: '#9A6B3F', fontSize: 10, textTransform: 'uppercase', letterSpacing: 2 }}>
                      <th style={{ textAlign: 'left', padding: '8px 0' }}></th>
                      <th style={{ textAlign: 'right' }}>Subject</th>
                      <th style={{ textAlign: 'right' }}>Submarket</th>
                      <th style={{ textAlign: 'right' }}>Market</th>
                    </tr>
                  </thead>
                  <tbody>
                    <tr style={{ borderBottom: '1px solid #f0f0f0' }}>
                      <td style={{ padding: '10px 0' }}>Vacancy</td>
                      <td style={{ textAlign: 'right' }}>{pct(deal.vacancy_rate_subject)}</td>
                      <td style={{ textAlign: 'right' }}>{pct(deal.vacancy_rate_submarket)}</td>
                      <td style={{ textAlign: 'right' }}>{pct(deal.vacancy_rate_market)}</td>
                    </tr>
                    <tr style={{ borderBottom: '1px solid #f0f0f0' }}>
                      <td style={{ padding: '10px 0' }}>Market Rent / Unit</td>
                      <td style={{ textAlign: 'right' }}>{dollars(deal.market_rent_subject)}</td>
                      <td style={{ textAlign: 'right' }}>{dollars(deal.market_rent_submarket)}</td>
                      <td style={{ textAlign: 'right' }}>{dollars(deal.market_rent_market)}</td>
                    </tr>
                    <tr style={{ borderBottom: '1px solid #f0f0f0' }}>
                      <td style={{ padding: '10px 0' }}>Concessions</td>
                      <td style={{ textAlign: 'right' }}>{pct(deal.concessions_subject)}</td>
                      <td style={{ textAlign: 'right' }}>{pct(deal.concessions_submarket)}</td>
                      <td style={{ textAlign: 'right' }}>{pct(deal.concessions_market)}</td>
                    </tr>
                    {deal.under_construction_units_market != null && (
                      <tr style={{ borderBottom: '1px solid #f0f0f0' }}>
                        <td style={{ padding: '10px 0' }}>Under Construction Units</td>
                        <td></td><td></td>
                        <td style={{ textAlign: 'right' }}>{num(deal.under_construction_units_market)}</td>
                      </tr>
                    )}
                    {deal.twelve_mo_sales_volume_submarket != null && (
                      <tr style={{ borderBottom: '1px solid #f0f0f0' }}>
                        <td style={{ padding: '10px 0' }}>12 Mo Sales Volume</td>
                        <td></td>
                        <td style={{ textAlign: 'right' }}>{compactDollars(deal.twelve_mo_sales_volume_submarket)}</td>
                        <td></td>
                      </tr>
                    )}
                    {deal.market_sales_price_per_unit != null && (
                      <tr>
                        <td style={{ padding: '10px 0' }}>Market Sales Price / Unit</td>
                        <td></td><td></td>
                        <td style={{ textAlign: 'right' }}>{compactDollars(deal.market_sales_price_per_unit)}</td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </Section>
            )}

            {/* Sale History */}
            {deal.sale_history && deal.sale_history.length > 0 && (
              <Section title="Sale History">
                <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
                  <thead>
                    <tr style={{ borderBottom: '1px solid #ddd', color: '#9A6B3F', fontSize: 10, textTransform: 'uppercase', letterSpacing: 2 }}>
                      <th style={{ textAlign: 'left', padding: '8px 0' }}>Date</th>
                      <th style={{ textAlign: 'left' }}>Type</th>
                      <th style={{ textAlign: 'right' }}>Price</th>
                      <th style={{ textAlign: 'right' }}>$ / Unit</th>
                      <th style={{ textAlign: 'right' }}>Cap</th>
                      <th style={{ textAlign: 'left' }}>Buyer</th>
                      <th style={{ textAlign: 'left' }}>Seller</th>
                    </tr>
                  </thead>
                  <tbody>
                    {deal.sale_history.map((row, i) => (
                      <tr key={i} style={{ borderBottom: '1px solid #f0f0f0' }}>
                        <td style={{ padding: '10px 0' }}>{row.date ?? '—'}</td>
                        <td>{row.type ?? '—'}</td>
                        <td style={{ textAlign: 'right' }}>{dollars(row.price)}</td>
                        <td style={{ textAlign: 'right' }}>{dollars(row.price_per_unit)}</td>
                        <td style={{ textAlign: 'right' }}>{pct(row.cap_rate)}</td>
                        <td>{row.buyer ?? '—'}</td>
                        <td>{row.seller ?? '—'}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </Section>
            )}

            {/* Loan & Owner */}
            <Grid>
              <Section title="Loan">
                <Field label="Origination Amount" value={dollars(deal.loan_amount)} />
                <Field label="Origination Date" value={deal.loan_origination_date} />
                <Field label="Maturity Date" value={deal.loan_maturity_date} />
                <Field label="Lender" value={deal.lender} />
                <Field label="Borrower" value={deal.borrower} />
                <Field label="Loan Type" value={deal.loan_type} />
                <Field label="Doc Number" value={deal.loan_doc_number} />
              </Section>

              <Section title="Ownership & Management">
                <Field label="Recorded Owner" value={deal.recorded_owner} />
                <Field label="True Owner" value={deal.true_owner} />
                <Field label="Owner Type" value={deal.owner_type} />
                <Field label="Property Manager" value={deal.property_manager} />
                <Field label="Manager Phone" value={deal.property_manager_phone} />
                <Field label="Manager Since" value={deal.property_manager_since} />
              </Section>
            </Grid>

            {/* Broker */}
            <Section title="Broker">
              <Grid>
                <div>
                  <Field label="Sale Broker (Firm)" value={deal.sale_broker} />
                  <Field label="Broker Name" value={deal.broker_name} />
                  <Field label="Broker Firm" value={deal.broker_firm} />
                </div>
                <div>
                  <Field label="Broker Phone" value={deal.broker_phone} />
                  <Field label="Broker Email" value={deal.broker_email} />
                  <Field label="Broker License" value={deal.broker_license} />
                  <Field label="MLS #" value={deal.mls_number} />
                </div>
              </Grid>
            </Section>

            {/* Public Record */}
            <Grid>
              <Section title={`Public Record${deal.assessment_year ? ` — ${deal.assessment_year}` : ''}`}>
                <Field label="Total Assessed" value={dollars(deal.assessed_total)} />
                <Field label="Improvements" value={dollars(deal.assessed_improvements)} />
                <Field label="Land" value={dollars(deal.assessed_land)} />
                <Field label="Annual Tax" value={dollars(deal.annual_tax)} />
                <Field label="Tax / Unit" value={dollars(deal.tax_per_unit)} />
                <Field label="Tax Year" value={deal.tax_year} />
              </Section>

              <Section title="Flood Risk">
                <Field label="Flood Risk Area" value={deal.flood_risk_area} />
                <Field label="FEMA Flood Zone" value={deal.flood_zone} />
                <Field label="In SFHA" value={deal.in_sfha} />
                <Field label="FEMA Map ID" value={deal.fema_map_id} />
                <Field label="FEMA Map Date" value={deal.fema_map_date} />
              </Section>
            </Grid>

            {/* Demographics */}
            {(deal.demographics_1mi || deal.demographics_3mi) && (
              <Section title="Demographics">
                <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
                  <thead>
                    <tr style={{ borderBottom: '1px solid #ddd', color: '#9A6B3F', fontSize: 10, textTransform: 'uppercase', letterSpacing: 2 }}>
                      <th style={{ textAlign: 'left', padding: '8px 0' }}></th>
                      <th style={{ textAlign: 'right' }}>1 mile</th>
                      <th style={{ textAlign: 'right' }}>3 miles</th>
                    </tr>
                  </thead>
                  <tbody>
                    {[
                      ['Population', 'population', num],
                      ['Households', 'households', num],
                      ['Median Age', 'median_age', (v: number | null) => v == null ? '—' : v.toFixed(1)],
                      ['Median HH Income', 'median_hh_income', dollars],
                      ['Daytime Employees', 'daytime_employees', num],
                      ['Population Growth (5y)', 'population_growth_5y', pct],
                      ['Household Growth (5y)', 'household_growth_5y', pct],
                    ].map(([label, key, fmt]) => {
                      const k = key as keyof NonNullable<Demographics>
                      const f = fmt as (v: number | null) => string
                      return (
                        <tr key={label as string} style={{ borderBottom: '1px solid #f0f0f0' }}>
                          <td style={{ padding: '10px 0' }}>{label as string}</td>
                          <td style={{ textAlign: 'right' }}>{f(deal.demographics_1mi?.[k] ?? null)}</td>
                          <td style={{ textAlign: 'right' }}>{f(deal.demographics_3mi?.[k] ?? null)}</td>
                        </tr>
                      )
                    })}
                  </tbody>
                </table>
              </Section>
            )}

            {/* Location */}
            <Section title="Location">
              <Grid>
                <div>
                  <Field label="Address" value={deal.address} />
                  <Field label="City" value={deal.city} />
                  <Field label="State" value={deal.state} />
                  <Field label="ZIP" value={deal.zip} />
                  <Field label="County" value={deal.county} />
                </div>
                <div>
                  <Field label="Market" value={deal.market} />
                  <Field label="Submarket" value={deal.submarket} />
                  <Field label="Submarket Cluster" value={deal.submarket_cluster} />
                  <Field label="CBSA" value={deal.cbsa} />
                  <Field label="DMA" value={deal.dma} />
                  <Field label="Location Type" value={deal.location_type} />
                </div>
              </Grid>
            </Section>

            {/* Transit */}
            {deal.transit_stations && deal.transit_stations.length > 0 && (
              <Section title="Public Transportation">
                <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
                  <thead>
                    <tr style={{ borderBottom: '1px solid #ddd', color: '#9A6B3F', fontSize: 10, textTransform: 'uppercase', letterSpacing: 2 }}>
                      <th style={{ textAlign: 'left', padding: '8px 0' }}>Station</th>
                      <th style={{ textAlign: 'left' }}>Type</th>
                      <th style={{ textAlign: 'right' }}>Drive</th>
                      <th style={{ textAlign: 'right' }}>Walk</th>
                      <th style={{ textAlign: 'right' }}>Distance</th>
                    </tr>
                  </thead>
                  <tbody>
                    {deal.transit_stations.map((row, i) => (
                      <tr key={i} style={{ borderBottom: '1px solid #f0f0f0' }}>
                        <td style={{ padding: '10px 0' }}>{row.name ?? '—'}</td>
                        <td>{row.type ?? '—'}</td>
                        <td style={{ textAlign: 'right' }}>{row.drive_min != null ? row.drive_min + ' min' : '—'}</td>
                        <td style={{ textAlign: 'right' }}>{row.walk_min != null ? row.walk_min + ' min' : '—'}</td>
                        <td style={{ textAlign: 'right' }}>{row.distance_mi != null ? row.distance_mi + ' mi' : '—'}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </Section>
            )}

            {/* Airports */}
            {deal.airports && deal.airports.length > 0 && (
              <Section title="Airports">
                <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
                  <thead>
                    <tr style={{ borderBottom: '1px solid #ddd', color: '#9A6B3F', fontSize: 10, textTransform: 'uppercase', letterSpacing: 2 }}>
                      <th style={{ textAlign: 'left', padding: '8px 0' }}>Airport</th>
                      <th style={{ textAlign: 'right' }}>Drive</th>
                      <th style={{ textAlign: 'right' }}>Distance</th>
                    </tr>
                  </thead>
                  <tbody>
                    {deal.airports.map((row, i) => (
                      <tr key={i} style={{ borderBottom: '1px solid #f0f0f0' }}>
                        <td style={{ padding: '10px 0' }}>{row.name ?? '—'}</td>
                        <td style={{ textAlign: 'right' }}>{row.drive_min != null ? row.drive_min + ' min' : '—'}</td>
                        <td style={{ textAlign: 'right' }}>{row.distance_mi != null ? row.distance_mi + ' mi' : '—'}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </Section>
            )}

            {/* Amenities */}
            {deal.amenities && deal.amenities.length > 0 && (
              <Section title="Amenities">
                <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                  {deal.amenities.map((a, i) => (
                    <span key={i} style={{ padding: '4px 12px', background: '#f0f0f0', borderRadius: 2, fontSize: 12 }}>{a}</span>
                  ))}
                </div>
              </Section>
            )}

            {/* Building Notes */}
            {deal.building_notes && (
              <Section title="Building Notes">
                <div style={{ fontSize: 14, color: '#444', lineHeight: 1.7, whiteSpace: 'pre-wrap' }}>{deal.building_notes}</div>
              </Section>
            )}

            {(deal.value_add_notes || deal.capital_improvements) && (
              <div>
                {deal.value_add_notes && (
                  <Section title="Value Add Notes">
                    <div style={{ fontSize: 14, color: '#444', lineHeight: 1.6 }}>{deal.value_add_notes}</div>
                  </Section>
                )}
                {deal.capital_improvements && (
                  <Section title="Capital Improvements">
                    <div style={{ fontSize: 14, color: '#444', lineHeight: 1.6 }}>{deal.capital_improvements}</div>
                  </Section>
                )}
              </div>
            )}

            {deal.property_id && (
              <div style={{ fontSize: 11, color: '#999', marginTop: 32, textAlign: 'right' }}>CoStar Property ID: {deal.property_id}</div>
            )}
          </div>
        )}
      </div>
    </div>
  )
}
