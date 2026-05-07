import type { SupabaseClient } from '@supabase/supabase-js'
import type { Database } from './types'
import type { ParsedDeal } from './parsed-deal'
import { deriveListingFields, derivePropertyFields, costarSources } from './derive'

type DB = SupabaseClient<Database>
type PropertyInsert = Database['public']['Tables']['properties']['Insert']
type ListingInsert = Database['public']['Tables']['listings']['Insert']
type BrokerInsert = Database['public']['Tables']['brokers']['Insert']

function nullIfEmpty(s: string | null | undefined): string | null {
  if (s == null) return null
  const t = s.trim()
  return t === '' ? null : t
}

function toPropertyFields(deal: ParsedDeal): PropertyInsert {
  const derivedProp = derivePropertyFields({
    unit_count: deal.unit_count,
    gross_sf: deal.building_sf,
    land_acres: deal.land_acres,
    land_sf: deal.land_sf,
    avg_unit_sf: deal.avg_unit_size_sf,
    units_per_acre: deal.units_per_acre,
    bldg_far: deal.bldg_far,
  })
  return {
    apn: nullIfEmpty(deal.apn),
    costar_property_id: nullIfEmpty(deal.property_id),
    street_address: nullIfEmpty(deal.address),
    city: nullIfEmpty(deal.city),
    state: nullIfEmpty(deal.state),
    zip: nullIfEmpty(deal.zip),
    county: nullIfEmpty(deal.county),
    market: nullIfEmpty(deal.market),
    submarket: nullIfEmpty(deal.submarket),
    submarket_cluster: nullIfEmpty(deal.submarket_cluster),
    neighborhood: nullIfEmpty(deal.neighborhood),
    cbsa: nullIfEmpty(deal.cbsa),
    dma: nullIfEmpty(deal.dma),
    location_type: nullIfEmpty(deal.location_type),

    year_built: deal.year_built,
    year_renovated: deal.year_renovated,
    unit_count: deal.unit_count,
    gross_sf: deal.building_sf,
    avg_unit_sf: derivedProp.avg_unit_sf,
    lot_sf: derivedProp.land_sf,
    land_acres: derivedProp.land_acres,
    stories: deal.stories,
    building_count: deal.building_count,
    units_per_acre: derivedProp.units_per_acre,
    bldg_far: derivedProp.bldg_far,
    typical_floor_sf: deal.typical_floor_sf,
    construction_type: nullIfEmpty(deal.construction),
    elevators: nullIfEmpty(deal.elevators),
    walk_up: deal.walk_up,
    metering: nullIfEmpty(deal.metering),
    zoning: nullIfEmpty(deal.zoning),
    parking_type: nullIfEmpty(deal.parking_spaces),
    parking_count: deal.parking_count,
    property_type: nullIfEmpty(deal.property_type),
    property_class: deal.property_class,
    star_rating: deal.star_rating,
    market_segment: nullIfEmpty(deal.market_segment),
    rent_type: nullIfEmpty(deal.rent_type),

    recorded_owner: nullIfEmpty(deal.recorded_owner),
    true_owner: nullIfEmpty(deal.true_owner),
    owner_type: nullIfEmpty(deal.owner_type),
    property_manager: nullIfEmpty(deal.property_manager),
    pm_phone: nullIfEmpty(deal.property_manager_phone),
    pm_since: nullIfEmpty(deal.property_manager_since),
    mls_number: nullIfEmpty(deal.mls_number),

    assessed_total: deal.assessed_total,
    assessed_improvements: deal.assessed_improvements,
    assessed_land: deal.assessed_land,
    assessment_year: deal.assessment_year,
    annual_tax: deal.annual_tax,
    tax_per_unit: deal.tax_per_unit,
    tax_year: deal.tax_year,

    flood_risk_area: nullIfEmpty(deal.flood_risk_area),
    flood_zone: nullIfEmpty(deal.flood_zone),
    in_sfha: deal.in_sfha,
    fema_map_id: nullIfEmpty(deal.fema_map_id),
    fema_map_date: nullIfEmpty(deal.fema_map_date),

    pedestrian_score: deal.pedestrian_score,
    cycling_score: deal.cycling_score,
    car_score: deal.car_score,
    transit_score: deal.transit_score,
    walk_score: deal.walk_score,
    bike_score: deal.bike_score,

    soft_story_retrofit: deal.soft_story_retrofit,
    value_add_notes: nullIfEmpty(deal.value_add_notes),
    capital_improvements: nullIfEmpty(deal.capital_improvements),
    amenities: deal.amenities,
    building_notes: nullIfEmpty(deal.building_notes),
    sale_highlights: nullIfEmpty(deal.sale_highlights),

    vacancy_rate_subject: deal.vacancy_rate_subject,
    vacancy_rate_submarket: deal.vacancy_rate_submarket,
    vacancy_rate_market: deal.vacancy_rate_market,
    market_rent_subject: deal.market_rent_subject,
    market_rent_submarket: deal.market_rent_submarket,
    market_rent_market: deal.market_rent_market,
    concessions_subject: deal.concessions_subject,
    concessions_submarket: deal.concessions_submarket,
    concessions_market: deal.concessions_market,
    under_construction_units_market: deal.under_construction_units_market,
    twelve_mo_sales_volume_submarket: deal.twelve_mo_sales_volume_submarket,
    market_sales_price_per_unit: deal.market_sales_price_per_unit,

    demographics_1mi: deal.demographics_1mi,
    demographics_3mi: deal.demographics_3mi,
    transit_stations: deal.transit_stations,
    airports: deal.airports,

    last_costar_parsed_at: new Date().toISOString(),
  }
}

function saleHistoryToTransactions(deal: ParsedDeal) {
  if (!deal.sale_history || deal.sale_history.length === 0) return null
  return deal.sale_history.map(row => ({
    type: 'sale',
    date: row.date,
    subtype: row.type,
    price: row.price,
    units: row.units,
    price_per_unit: row.price_per_unit,
    cap_rate: row.cap_rate,
    buyer: row.buyer,
    seller: row.seller,
    source: 'costar_pdf',
  }))
}

export async function upsertProperty(db: DB, deal: ParsedDeal): Promise<string> {
  const fields = toPropertyFields(deal)
  const transactions = saleHistoryToTransactions(deal)

  async function findExisting(): Promise<string | null> {
    if (fields.apn) {
      const { data } = await db.from('properties').select('id').eq('apn', fields.apn).maybeSingle()
      if (data) return data.id
    }
    if (fields.street_address && fields.city && fields.state && fields.zip) {
      const { data } = await db
        .from('properties')
        .select('id')
        .ilike('street_address', fields.street_address)
        .ilike('city', fields.city)
        .eq('state', fields.state)
        .eq('zip', fields.zip)
        .maybeSingle()
      if (data) return data.id
    }
    return null
  }

  const existingId = await findExisting()

  if (existingId) {
    // update PDF-managed fields; do NOT clobber transaction_history if already enriched
    const { error } = await db.from('properties').update(fields).eq('id', existingId)
    if (error) throw error

    if (transactions) {
      const { data: existing } = await db
        .from('properties')
        .select('transaction_history')
        .eq('id', existingId)
        .single()
      if (!existing?.transaction_history) {
        await db.from('properties').update({ transaction_history: transactions }).eq('id', existingId)
      }
    }
    return existingId
  }

  // insert new — include transaction_history seeded from PDF sale_history
  const { data, error } = await db
    .from('properties')
    .insert({ ...fields, transaction_history: transactions })
    .select('id')
    .single()
  if (error) throw error
  return data.id
}

export async function upsertBrokerFromDeal(db: DB, deal: ParsedDeal): Promise<string | null> {
  const name = nullIfEmpty(deal.broker_name)
  const email = nullIfEmpty(deal.broker_email)?.toLowerCase() ?? null
  const dre = nullIfEmpty(deal.broker_license)
  const firm = nullIfEmpty(deal.broker_firm) ?? nullIfEmpty(deal.sale_broker)

  if (!name && !email && !dre) return null

  // try email
  if (email) {
    const { data } = await db.from('brokers').select('id').eq('email', email).maybeSingle()
    if (data) return data.id
  }

  // try DRE
  if (dre) {
    const { data } = await db.from('brokers').select('id').eq('dre_license', dre).maybeSingle()
    if (data) return data.id
  }

  // try (name, firm)
  if (name && firm) {
    const { data } = await db
      .from('brokers')
      .select('id')
      .ilike('name', name)
      .ilike('firm', firm)
      .maybeSingle()
    if (data) return data.id
  }

  // insert new
  const insert: BrokerInsert = {
    name,
    firm,
    phone: nullIfEmpty(deal.broker_phone),
    email,
    dre_license: dre,
  }

  const { data, error } = await db.from('brokers').insert(insert).select('id').single()
  if (error) throw error
  return data.id
}

export async function createListing(
  db: DB,
  args: { propertyId: string; brokerId: string | null; deal: ParsedDeal }
): Promise<string> {
  const { propertyId, brokerId, deal } = args
  const derived = deriveListingFields({
    year_built: deal.year_built,
    list_price: deal.list_price,
    sale_price: deal.sale_price,
    grm: deal.grm,
    unit_count: deal.unit_count,
    building_sf: deal.building_sf,
    price_per_unit: deal.price_per_unit,
    price_per_sf: deal.price_per_sf,
  })
  const sources = costarSources({ status: deal.status, cap_rate: deal.cap_rate, grm: deal.grm })

  const insert: ListingInsert = {
    property_id: propertyId,
    listing_broker_id: brokerId,
    status: deal.status,
    list_price: deal.list_price,
    sale_price: deal.sale_price,
    sale_date: deal.sale_date,
    sale_type: nullIfEmpty(deal.sale_type),
    cap_rate_current: deal.cap_rate,
    grm_current: deal.grm,
    noi_current: deal.noi,
    cap_rate_current_source: sources.cap_rate_current_source,
    grm_current_source: sources.grm_current_source,

    loan_amount: deal.loan_amount,
    loan_origination_date: deal.loan_origination_date,
    loan_maturity_date: deal.loan_maturity_date,
    lender: nullIfEmpty(deal.lender),
    borrower: nullIfEmpty(deal.borrower),
    loan_type: nullIfEmpty(deal.loan_type),
    loan_doc_number: nullIfEmpty(deal.loan_doc_number),

    unit_mix: deal.unit_mix,
    unit_mix_updated: deal.unit_mix_updated,

    last_om_parsed_at: null,
    ...derived,
  }

  const { data, error } = await db.from('listings').insert(insert).select('id').single()
  if (error) throw error
  return data.id
}

export async function persistDeal(db: DB, deal: ParsedDeal) {
  const propertyId = await upsertProperty(db, deal)
  const brokerId = await upsertBrokerFromDeal(db, deal)
  const listingId = await createListing(db, { propertyId, brokerId, deal })
  return { propertyId, brokerId, listingId }
}
