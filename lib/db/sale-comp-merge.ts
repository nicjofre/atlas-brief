import type { SupabaseClient } from '@supabase/supabase-js'
import type { Database } from './types'
import type { FieldsChanged } from './augment-merge'
import { deriveListingFields, derivePropertyFields, costarSources } from './derive'

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
// payload type matching SALE_COMP_PROMPT
// ============================================================

type BrokerPayload = {
  name?: string | null
  title?: string | null
  firm?: string | null
  phone?: string | null
  cell?: string | null
  email?: string | null
  dre_license?: string | null
  office_address?: string | null
}

export type SaleCompPayload = {
  property?: {
    address?: string | null
    city?: string | null
    state?: string | null
    zip?: string | null
    apn?: string | null
    year_built?: number | null
    unit_count?: number | null
    gross_sf?: number | null
    lot_sf?: number | null
    land_acres?: number | null
    stories?: number | null
    construction_type?: string | null
    property_class?: 'A' | 'B' | 'C' | null
    zoning?: string | null
    submarket?: string | null
  } | null
  transaction?: {
    sale_date?: string | null
    recording_date?: string | null
    sale_price?: number | null
    initial_ask_price?: number | null
    price_per_unit?: number | null
    price_per_sf?: number | null
    price_per_acre_land?: number | null
    price_per_sf_land?: number | null
    transfer_tax?: number | null
    actual_cap_rate?: number | null
    noi_current?: number | null
    sale_type?: string | null
    price_status?: string | null
    comp_status?: string | null
    document_number?: string | null
    hold_period_months?: number | null
    sale_notes?: string | null
  } | null
  buyer?: {
    recorded_buyer?: string | null
    true_buyer?: string | null
    true_buyer_address?: string | null
    true_buyer_phone?: string | null
    buyer_contact_name?: string | null
    buyer_contact_phone?: string | null
    buyer_contact_cell?: string | null
    buyer_origin?: string | null
    buyer_type?: string | null
    buyer_secondary_type?: string | null
    buyer_activity_acquisitions?: number | null
    buyer_activity_dispositions?: number | null
  } | null
  seller?: {
    recorded_seller?: string | null
    true_seller?: string | null
    true_seller_address?: string | null
    true_seller_phone?: string | null
    seller_contact_name?: string | null
    seller_contact_phone?: string | null
    seller_contact_cell?: string | null
    seller_origin?: string | null
    seller_type?: string | null
    seller_secondary_type?: string | null
  } | null
  listing_broker?: BrokerPayload | null
  buyer_broker?: BrokerPayload | null
}

// ============================================================
// broker upsert
// ============================================================

async function upsertBroker(db: DB, b: BrokerPayload): Promise<string | null> {
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
// helpers
// ============================================================

function scToPropertyFields(payload: SaleCompPayload): PropertyInsert {
  const p = payload.property ?? {}
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
  }
}

function scToListingFields(
  payload: SaleCompPayload,
  args: { listingBrokerId: string | null; buyerBrokerId: string | null }
): ListingInsert {
  const t = payload.transaction ?? {}
  const b = payload.buyer ?? {}
  const s = payload.seller ?? {}
  const p = payload.property ?? {}

  const derived = deriveListingFields({
    year_built: p.year_built ?? null,
    list_price: t.initial_ask_price ?? null,
    sale_price: t.sale_price ?? null,
    grm: null,
    unit_count: p.unit_count ?? null,
    building_sf: p.gross_sf ?? null,
    price_per_unit: t.price_per_unit ?? null,
    price_per_sf: t.price_per_sf ?? null,
  })

  const sources = costarSources({
    status: 'sold',
    cap_rate: t.actual_cap_rate ?? null,
    grm: null,
  })

  return {
    property_id: '', // filled by caller
    listing_broker_id: args.listingBrokerId,
    buyer_broker_id: args.buyerBrokerId,
    status: 'sold',
    sale_price: t.sale_price ?? null,
    sale_date: t.sale_date ?? null,
    sale_type: nullIfEmpty(t.sale_type),
    list_price: t.initial_ask_price ?? null,
    initial_ask_price: t.initial_ask_price ?? null,
    cap_rate_current: t.actual_cap_rate ?? null,
    cap_rate_current_source: sources.cap_rate_current_source,
    noi_current: t.noi_current ?? null,
    recording_date: t.recording_date ?? null,
    transfer_tax: t.transfer_tax ?? null,
    price_status: nullIfEmpty(t.price_status),
    comp_status: nullIfEmpty(t.comp_status),
    loan_doc_number: nullIfEmpty(t.document_number),
    hold_period_months: t.hold_period_months ?? null,
    sale_notes: nullIfEmpty(t.sale_notes),
    price_per_acre_land: t.price_per_acre_land ?? null,
    price_per_sf_land: t.price_per_sf_land ?? null,

    recorded_buyer: nullIfEmpty(b.recorded_buyer),
    true_buyer: nullIfEmpty(b.true_buyer),
    buyer_contact: nullIfEmpty(b.buyer_contact_name),
    buyer_phone: nullIfEmpty(b.buyer_contact_phone) ?? nullIfEmpty(b.true_buyer_phone),
    buyer_origin: nullIfEmpty(b.buyer_origin),
    buyer_type: nullIfEmpty(b.buyer_type),
    buyer_secondary_type: nullIfEmpty(b.buyer_secondary_type),
    buyer_activity_acquisitions: b.buyer_activity_acquisitions ?? null,
    buyer_activity_dispositions: b.buyer_activity_dispositions ?? null,

    recorded_seller: nullIfEmpty(s.recorded_seller),
    true_seller: nullIfEmpty(s.true_seller),
    seller_contact: nullIfEmpty(s.seller_contact_name),
    seller_phone: nullIfEmpty(s.seller_contact_phone) ?? nullIfEmpty(s.true_seller_phone),
    seller_type: nullIfEmpty(s.seller_type),
    seller_secondary_type: nullIfEmpty(s.seller_secondary_type),

    rso_applicable: derived.rso_applicable,
    ab1482_applicable: derived.ab1482_applicable,
    ula_threshold_status: derived.ula_threshold_status,
    ula_tax_estimate: derived.ula_tax_estimate,
    bid_ask_delta: derived.bid_ask_delta,
    price_per_unit: derived.price_per_unit,
    price_per_sf: derived.price_per_sf,
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

async function upsertProperty(db: DB, fields: PropertyInsert): Promise<string> {
  if (fields.apn) {
    const { data } = await db.from('properties').select('id').eq('apn', fields.apn).maybeSingle()
    if (data) {
      await db.from('properties').update(stripUndefined(fields)).eq('id', data.id)
      return data.id
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
      return data.id
    }
  }
  const { data, error } = await db.from('properties').insert(fields).select('id').single()
  if (error) throw error
  return data.id
}

// ============================================================
// MODE 1: create new sold listing from Sales Comp paste
// ============================================================

export async function createListingFromSaleComp(
  db: DB,
  payload: SaleCompPayload
): Promise<{ listingId: string; propertyId: string; existingListingsForProperty: number }> {
  const propertyFields = scToPropertyFields(payload)
  const propertyId = await upsertProperty(db, propertyFields)

  const listingBrokerId = payload.listing_broker
    ? await upsertBroker(db, payload.listing_broker)
    : null
  const buyerBrokerId = payload.buyer_broker
    ? await upsertBroker(db, payload.buyer_broker)
    : null

  const { count } = await db
    .from('listings')
    .select('id', { count: 'exact', head: true })
    .eq('property_id', propertyId)

  const listingFields = scToListingFields(payload, { listingBrokerId, buyerBrokerId })
  listingFields.property_id = propertyId

  const { data, error } = await db.from('listings').insert(listingFields).select('id').single()
  if (error) throw error

  return {
    listingId: data.id,
    propertyId,
    existingListingsForProperty: count ?? 0,
  }
}

// ============================================================
// MODE 2: augment existing listing with Sales Comp data
// ============================================================

export async function augmentListingFromSaleComp(
  db: DB,
  args: { listingId: string; payload: SaleCompPayload }
): Promise<FieldsChanged> {
  const { listingId, payload } = args

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

  // ----- property merge (only fill nulls) -----
  const incomingProp = scToPropertyFields(payload)
  const propertyUpdate: PropertyUpdate = {}
  for (const [key, value] of Object.entries(incomingProp)) {
    if (value == null || value === '') continue
    const existingValue = (existingProperty as Record<string, unknown> | null)?.[key]
    if (existingValue == null || existingValue === '') {
      ;(propertyUpdate as Record<string, unknown>)[key] = value
    }
  }

  // ----- broker upserts -----
  const listingBrokerId = payload.listing_broker
    ? await upsertBroker(db, payload.listing_broker)
    : null
  const buyerBrokerId = payload.buyer_broker
    ? await upsertBroker(db, payload.buyer_broker)
    : null

  // ----- listing merge -----
  const incomingListing = scToListingFields(payload, { listingBrokerId, buyerBrokerId })
  const listingUpdate: ListingUpdate = {}

  // Sales Comp authoritative fields (always set if non-null — these are at-close verified)
  const scAuthoritative = [
    'sale_price', 'sale_date', 'sale_type', 'cap_rate_current', 'cap_rate_current_source',
    'noi_current', 'recording_date', 'transfer_tax', 'price_status', 'comp_status',
    'hold_period_months', 'sale_notes', 'price_per_acre_land', 'price_per_sf_land',
    'recorded_buyer', 'true_buyer', 'buyer_contact', 'buyer_phone',
    'buyer_origin', 'buyer_type', 'buyer_secondary_type',
    'buyer_activity_acquisitions', 'buyer_activity_dispositions',
    'recorded_seller', 'true_seller', 'seller_contact', 'seller_phone',
    'seller_type', 'seller_secondary_type',
    'rso_applicable', 'ab1482_applicable', 'ula_threshold_status', 'ula_tax_estimate',
    'bid_ask_delta', 'price_per_unit', 'price_per_sf',
    'status',
  ] as const
  for (const key of scAuthoritative) {
    const v = (incomingListing as Record<string, unknown>)[key]
    if (v != null) (listingUpdate as Record<string, unknown>)[key] = v
  }

  // Brokers: only set if existing is null
  if (listingBrokerId && !existingListing.listing_broker_id) {
    listingUpdate.listing_broker_id = listingBrokerId
  }
  if (buyerBrokerId && !existingListing.buyer_broker_id) {
    listingUpdate.buyer_broker_id = buyerBrokerId
  }

  // initial_ask_price + list_price: only fill if null
  if (incomingListing.initial_ask_price != null && existingListing.initial_ask_price == null) {
    listingUpdate.initial_ask_price = incomingListing.initial_ask_price
  }
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
