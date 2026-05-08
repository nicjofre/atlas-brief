import type { SupabaseClient } from '@supabase/supabase-js'
import type { Database } from './types'
import type { FieldsChanged } from './augment-merge'
import { deriveListingFields, derivePropertyFields, omSources } from './derive'

type DB = SupabaseClient<Database>
type PropertyInsert = Database['public']['Tables']['properties']['Insert']
type PropertyUpdate = Database['public']['Tables']['properties']['Update']
type ListingInsert = Database['public']['Tables']['listings']['Insert']
type ListingUpdate = Database['public']['Tables']['listings']['Update']
type BrokerInsert = Database['public']['Tables']['brokers']['Insert']

function nullIfEmpty(s: string | null | undefined): string | null {
  if (s == null) return null
  const t = String(s).trim()
  return t === '' ? null : t
}

function diff<T extends Record<string, unknown>>(before: T, after: Partial<T>): FieldsChanged {
  const changed: FieldsChanged = {}
  for (const key of Object.keys(after)) {
    const a = before[key]
    const b = (after as Record<string, unknown>)[key]
    if (b === undefined) continue
    if (JSON.stringify(a) !== JSON.stringify(b)) {
      changed[key] = { from: a ?? null, to: b ?? null }
    }
  }
  return changed
}

// ============================================================
// types matching OM_PROMPT output
// ============================================================

export type OMBrokerPayload = {
  name?: string | null
  title?: string | null
  firm?: string | null
  phone?: string | null
  cell?: string | null
  email?: string | null
  dre_license?: string | null
  office_address?: string | null
}

export type OMPayload = {
  property?: {
    name?: string | null
    address?: string | null
    city?: string | null
    state?: string | null
    zip?: string | null
    apn?: string | null
    year_built?: number | null
    year_renovated?: number | null
    unit_count?: number | null
    gross_sf?: number | null
    lot_sf?: number | null
    land_acres?: number | null
    stories?: number | null
    construction_type?: string | null
    property_class?: 'A' | 'B' | 'C' | null
    zoning?: string | null
    submarket?: string | null
    amenities?: string[] | null
    architectural_notes?: string | null
    capital_improvements?: string | null
    value_add_notes?: string | null
  } | null
  listing?: {
    list_price?: number | null
    list_price_note?: string | null
    cap_rate_current?: number | null
    cap_rate_market?: number | null
    grm_current?: number | null
    grm_market?: number | null
    noi_current?: number | null
    noi_market?: number | null
    expense_ratio_current?: number | null
    expense_ratio_market?: number | null
    scheduled_gross_income_current?: number | null
    scheduled_gross_income_market?: number | null
    total_expenses_current?: number | null
    total_expenses_market?: number | null
    vacancy_rate_used?: number | null
    implied_monthly_rent_current?: number | null
    implied_monthly_rent_market?: number | null
    expense_breakdown?: { category: string; current?: number | null; market?: number | null }[] | null
  } | null
  unit_mix?: {
    bed_type?: string | null
    units?: number | null
    avg_sf?: number | null
    current_avg_rent?: number | null
    market_avg_rent?: number | null
    vacant_count?: number | null
  }[] | null
  in_unit_features?: string[] | null
  marketing_quotes?: { label?: string | null; body?: string | null }[] | null
  om_highlights?: string[] | null
  photos?: { caption?: string | null; page?: number | null; role?: string | null }[] | null
  listing_broker?: OMBrokerPayload | null
  co_listing_brokers?: OMBrokerPayload[] | null
}

// ============================================================
// broker upsert
// ============================================================

async function upsertBroker(db: DB, b: OMBrokerPayload): Promise<string | null> {
  const name = nullIfEmpty(b.name)
  const email = nullIfEmpty(b.email)?.toLowerCase() ?? null
  const dre = nullIfEmpty(b.dre_license)
  const firm = nullIfEmpty(b.firm)

  if (!name && !email && !dre) return null

  const insert: BrokerInsert = {
    name,
    title: nullIfEmpty(b.title),
    firm,
    phone: nullIfEmpty(b.phone),
    cell: nullIfEmpty(b.cell),
    email,
    dre_license: dre,
    office_address: nullIfEmpty(b.office_address),
  }

  if (email) {
    const { data } = await db.from('brokers').select('id').eq('email', email).maybeSingle()
    if (data) {
      await db.from('brokers').update(insert).eq('id', data.id)
      return data.id
    }
  }
  if (dre) {
    const { data } = await db.from('brokers').select('id').eq('dre_license', dre).maybeSingle()
    if (data) {
      await db.from('brokers').update(insert).eq('id', data.id)
      return data.id
    }
  }
  if (name && firm) {
    const { data } = await db
      .from('brokers')
      .select('id')
      .ilike('name', name)
      .ilike('firm', firm)
      .maybeSingle()
    if (data) {
      await db.from('brokers').update(insert).eq('id', data.id)
      return data.id
    }
  }

  const { data, error } = await db.from('brokers').insert(insert).select('id').single()
  if (error) throw error
  return data.id
}

// ============================================================
// helpers to translate OM payload to property/listing fields
// ============================================================

function omToPropertyFields(om: OMPayload): PropertyInsert {
  const p = om.property ?? {}
  const derivedProp = derivePropertyFields({
    unit_count: p.unit_count ?? null,
    gross_sf: p.gross_sf ?? null,
    land_acres: p.land_acres ?? null,
    land_sf: p.lot_sf ?? null,
    avg_unit_sf: null,
    units_per_acre: null,
    bldg_far: null,
  })
  return {
    street_address: nullIfEmpty(p.address),
    city: nullIfEmpty(p.city),
    state: nullIfEmpty(p.state),
    zip: nullIfEmpty(p.zip),
    apn: nullIfEmpty(p.apn),
    year_built: p.year_built ?? null,
    year_renovated: p.year_renovated ?? null,
    unit_count: p.unit_count ?? null,
    gross_sf: p.gross_sf ?? null,
    lot_sf: derivedProp.land_sf,
    land_acres: derivedProp.land_acres,
    avg_unit_sf: derivedProp.avg_unit_sf,
    units_per_acre: derivedProp.units_per_acre,
    bldg_far: derivedProp.bldg_far,
    stories: p.stories ?? null,
    construction_type: nullIfEmpty(p.construction_type),
    property_class: p.property_class ?? null,
    zoning: nullIfEmpty(p.zoning),
    submarket: nullIfEmpty(p.submarket),
    amenities: p.amenities ?? null,
    architectural_notes: nullIfEmpty(p.architectural_notes),
    capital_improvements: nullIfEmpty(p.capital_improvements),
    value_add_notes: nullIfEmpty(p.value_add_notes),
  }
}

function omToListingFields(om: OMPayload, brokerId: string | null): ListingInsert {
  const l = om.listing ?? {}
  const p = om.property ?? {}

  const derived = deriveListingFields({
    year_built: p.year_built ?? null,
    list_price: l.list_price ?? null,
    sale_price: null,
    grm: l.grm_current ?? null,
    unit_count: p.unit_count ?? null,
    building_sf: p.gross_sf ?? null,
    price_per_unit: null,
    price_per_sf: null,
  })

  const sources = omSources({
    cap_rate_current: l.cap_rate_current ?? null,
    cap_rate_market: l.cap_rate_market ?? null,
    grm_current: l.grm_current ?? null,
    grm_market: l.grm_market ?? null,
  })

  return {
    property_id: '',  // filled in by caller
    listing_broker_id: brokerId,
    status: 'for_sale',
    list_price: l.list_price ?? null,
    cap_rate_current: l.cap_rate_current ?? null,
    cap_rate_market: l.cap_rate_market ?? null,
    grm_current: l.grm_current ?? null,
    grm_market: l.grm_market ?? null,
    cap_rate_current_source: sources.cap_rate_current_source,
    cap_rate_market_source: sources.cap_rate_market_source,
    grm_current_source: sources.grm_current_source,
    grm_market_source: sources.grm_market_source,
    noi_current: l.noi_current ?? null,
    expense_ratio: l.expense_ratio_current ?? null,
    price_per_unit: derived.price_per_unit,
    price_per_sf: derived.price_per_sf,
    implied_monthly_rent_current: l.implied_monthly_rent_current ?? null,
    implied_monthly_rent_market: l.implied_monthly_rent_market ?? null,
    implied_gross_annual_current: l.scheduled_gross_income_current ?? derived.implied_gross_annual_current,
    implied_gross_annual_market: l.scheduled_gross_income_market ?? null,
    unit_mix: om.unit_mix ?? null,
    in_unit_features: om.in_unit_features ?? null,
    marketing_quotes: om.marketing_quotes ?? null,
    om_highlights: om.om_highlights ?? null,
    photos: om.photos ?? null,
    last_om_parsed_at: new Date().toISOString(),
    rso_applicable: derived.rso_applicable,
    ab1482_applicable: derived.ab1482_applicable,
    ula_threshold_status: derived.ula_threshold_status,
    ula_tax_estimate: derived.ula_tax_estimate,
  }
}

function stripUndefined<T extends object>(obj: T): Partial<T> {
  const out: Partial<T> = {}
  for (const [k, v] of Object.entries(obj)) {
    if (v !== null && v !== undefined) {
      ;(out as Record<string, unknown>)[k] = v
    }
  }
  return out
}

// ============================================================
// upsert property by APN/address (mirrors CoStar logic)
// ============================================================

async function upsertPropertyFromOm(db: DB, fields: PropertyInsert): Promise<{ id: string; created: boolean }> {
  if (fields.apn) {
    const { data } = await db.from('properties').select('id').eq('apn', fields.apn).maybeSingle()
    if (data) {
      await db.from('properties').update(stripUndefined(fields)).eq('id', data.id)
      return { id: data.id, created: false }
    }
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
    if (data) {
      await db.from('properties').update(stripUndefined(fields)).eq('id', data.id)
      return { id: data.id, created: false }
    }
  }
  const { data, error } = await db.from('properties').insert(fields).select('id').single()
  if (error) throw error
  return { id: data.id, created: true }
}

// ============================================================
// MODE 1: create new listing from OM
// ============================================================

export async function createListingFromOm(
  db: DB,
  om: OMPayload
): Promise<{ listingId: string; propertyId: string; brokerId: string | null; existingListingsForProperty: number }> {
  const propertyFields = omToPropertyFields(om)
  const { id: propertyId } = await upsertPropertyFromOm(db, propertyFields)

  const brokerId = om.listing_broker
    ? await upsertBroker(db, om.listing_broker)
    : null

  // upsert co-listing brokers too (for record-keeping; not linked to listing yet — schema only has 1 listing_broker_id)
  if (om.co_listing_brokers && om.co_listing_brokers.length > 0) {
    for (const cb of om.co_listing_brokers) {
      await upsertBroker(db, cb)
    }
  }

  // count existing listings on this property (for warning)
  const { count } = await db
    .from('listings')
    .select('id', { count: 'exact', head: true })
    .eq('property_id', propertyId)

  const listingFields = omToListingFields(om, brokerId)
  listingFields.property_id = propertyId

  const { data, error } = await db.from('listings').insert(listingFields).select('id').single()
  if (error) throw error

  return {
    listingId: data.id,
    propertyId,
    brokerId,
    existingListingsForProperty: count ?? 0,
  }
}

// ============================================================
// MODE 2: augment existing listing from OM
// ============================================================

export async function augmentListingFromOm(
  db: DB,
  args: { listingId: string; om: OMPayload }
): Promise<FieldsChanged> {
  const { listingId, om } = args

  const { data: existingListing } = await db
    .from('listings')
    .select('*')
    .eq('id', listingId)
    .single()

  if (!existingListing) throw new Error('Listing not found')

  const { data: existingProperty } = await db
    .from('properties')
    .select('*')
    .eq('id', existingListing.property_id)
    .single()

  // ----- property merge (only fill nulls; don't clobber CoStar data) -----
  const incomingProp = omToPropertyFields(om)
  const propertyUpdate: PropertyUpdate = {}
  for (const [key, value] of Object.entries(incomingProp)) {
    if (value == null || value === '') continue
    const existingValue = (existingProperty as Record<string, unknown> | null)?.[key]
    if (existingValue == null || existingValue === '') {
      ;(propertyUpdate as Record<string, unknown>)[key] = value
    }
    // for capital_improvements / value_add_notes, append if existing is short
    if (key === 'capital_improvements' || key === 'value_add_notes') {
      if (existingValue && typeof existingValue === 'string' && typeof value === 'string' && !existingValue.includes(value)) {
        ;(propertyUpdate as Record<string, unknown>)[key] = `${existingValue}\n\n${value}`
      }
    }
  }

  // ----- listing merge (OM-derived fields override; preserve CoStar-only) -----
  const brokerId = om.listing_broker ? await upsertBroker(db, om.listing_broker) : null
  if (om.co_listing_brokers) {
    for (const cb of om.co_listing_brokers) await upsertBroker(db, cb)
  }

  const incomingListing = omToListingFields(om, brokerId)
  const listingUpdate: ListingUpdate = {}
  // OM-authoritative fields: always set if non-null
  const omAuthoritative = [
    'cap_rate_current', 'cap_rate_market', 'grm_current', 'grm_market',
    'cap_rate_current_source', 'cap_rate_market_source',
    'grm_current_source', 'grm_market_source',
    'noi_current', 'expense_ratio', 'price_per_unit', 'price_per_sf',
    'implied_monthly_rent_current', 'implied_monthly_rent_market',
    'implied_gross_annual_current', 'implied_gross_annual_market',
    'unit_mix', 'in_unit_features', 'marketing_quotes',
    'om_highlights', 'photos',
    'last_om_parsed_at',
  ] as const
  for (const key of omAuthoritative) {
    const v = (incomingListing as Record<string, unknown>)[key]
    if (v != null) (listingUpdate as Record<string, unknown>)[key] = v
  }
  // listing_broker_id: only if existing is null (don't overwrite)
  if (brokerId && !existingListing.listing_broker_id) {
    listingUpdate.listing_broker_id = brokerId
  }
  // list_price: only set if existing is null
  if (incomingListing.list_price != null && existingListing.list_price == null) {
    listingUpdate.list_price = incomingListing.list_price
  }

  const changed: FieldsChanged = {
    ...diff(existingProperty as Record<string, unknown>, propertyUpdate as Record<string, unknown>),
    ...diff(existingListing as Record<string, unknown>, listingUpdate as Record<string, unknown>),
  }

  if (Object.keys(propertyUpdate).length > 0) {
    await db.from('properties').update(propertyUpdate).eq('id', existingListing.property_id)
  }
  if (Object.keys(listingUpdate).length > 0) {
    await db.from('listings').update(listingUpdate).eq('id', listingId)
  }

  return changed
}
