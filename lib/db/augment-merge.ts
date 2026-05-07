import type { SupabaseClient } from '@supabase/supabase-js'
import type { Database } from './types'

type DB = SupabaseClient<Database>
type PropertyUpdate = Database['public']['Tables']['properties']['Update']
type ListingUpdate = Database['public']['Tables']['listings']['Update']
type BrokerInsert = Database['public']['Tables']['brokers']['Insert']

export type FieldsChanged = Record<string, { from: unknown; to: unknown }>

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
// broker upsert (used by contacts paste)
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
// merge: contacts
// ============================================================

export type ContactsPayload = {
  listing_broker?: BrokerPayload | null
  buyer_broker?: BrokerPayload | null
  property_manager?: { name?: string | null; address?: string | null; phone?: string | null; since?: string | null } | null
  recorded_owner?: { name?: string | null; address?: string | null; since?: string | null; ownership_type?: string | null } | null
  true_owner?: { name?: string | null; address?: string | null; phone?: string | null; since?: string | null } | null
}

export async function mergeContacts(
  db: DB,
  args: { listingId: string; propertyId: string; payload: ContactsPayload }
): Promise<FieldsChanged> {
  const { listingId, propertyId, payload } = args

  const { data: existingListing } = await db
    .from('listings')
    .select('listing_broker_id, buyer_broker_id')
    .eq('id', listingId)
    .single()

  const { data: existingProperty } = await db
    .from('properties')
    .select('property_manager, pm_phone, pm_since, pm_address, recorded_owner, owner_type, recorded_owner_address, recorded_owner_since, true_owner, true_owner_address, true_owner_phone, true_owner_since')
    .eq('id', propertyId)
    .single()

  const listingUpdate: ListingUpdate = {}
  const propertyUpdate: PropertyUpdate = {}

  if (payload.listing_broker) {
    const id = await upsertBroker(db, payload.listing_broker)
    if (id) listingUpdate.listing_broker_id = id
  }
  if (payload.buyer_broker) {
    const id = await upsertBroker(db, payload.buyer_broker)
    if (id) listingUpdate.buyer_broker_id = id
  }
  if (payload.property_manager) {
    const pm = payload.property_manager
    if (nullIfEmpty(pm.name)) propertyUpdate.property_manager = nullIfEmpty(pm.name)
    if (nullIfEmpty(pm.phone)) propertyUpdate.pm_phone = nullIfEmpty(pm.phone)
    if (nullIfEmpty(pm.since)) propertyUpdate.pm_since = nullIfEmpty(pm.since)
    if (nullIfEmpty(pm.address)) propertyUpdate.pm_address = nullIfEmpty(pm.address)
  }
  if (payload.recorded_owner) {
    const ro = payload.recorded_owner
    if (nullIfEmpty(ro.name)) propertyUpdate.recorded_owner = nullIfEmpty(ro.name)
    if (nullIfEmpty(ro.ownership_type)) propertyUpdate.owner_type = nullIfEmpty(ro.ownership_type)
    if (nullIfEmpty(ro.address)) propertyUpdate.recorded_owner_address = nullIfEmpty(ro.address)
    if (nullIfEmpty(ro.since)) propertyUpdate.recorded_owner_since = nullIfEmpty(ro.since)
  }
  if (payload.true_owner) {
    const to = payload.true_owner
    if (nullIfEmpty(to.name)) propertyUpdate.true_owner = nullIfEmpty(to.name)
    if (nullIfEmpty(to.address)) propertyUpdate.true_owner_address = nullIfEmpty(to.address)
    if (nullIfEmpty(to.phone)) propertyUpdate.true_owner_phone = nullIfEmpty(to.phone)
    if (nullIfEmpty(to.since)) propertyUpdate.true_owner_since = nullIfEmpty(to.since)
  }

  const changed: FieldsChanged = {
    ...diff(existingListing as Record<string, unknown>, listingUpdate as Record<string, unknown>),
    ...diff(existingProperty as Record<string, unknown>, propertyUpdate as Record<string, unknown>),
  }

  if (Object.keys(listingUpdate).length > 0) {
    await db.from('listings').update(listingUpdate).eq('id', listingId)
  }
  if (Object.keys(propertyUpdate).length > 0) {
    await db.from('properties').update(propertyUpdate).eq('id', propertyId)
  }

  return changed
}

// ============================================================
// merge: public_record
// ============================================================

export type TransactionEvent = {
  type?: 'sale' | 'loan' | string | null
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
  source?: string | null
  subtype?: string | null
}

export type AssessmentRow = {
  year?: number | null
  total_assessed?: number | null
  improved_assessed?: number | null
  land_assessed?: number | null
  pct_improved?: number | null
  tax_year?: number | null
  tax_amount?: number | null
}

export type PublicRecordPayload = {
  recorded_owner?: { name?: string | null; ownership_type?: string | null; mailing_address?: string | null } | null
  subdivision?: string | null
  legal_description?: string | null
  census_tract?: string | null
  municipality?: string | null
  land_use?: string | null
  transaction_history?: TransactionEvent[]
  assessment_history?: AssessmentRow[]
}

function transactionKey(t: TransactionEvent): string {
  return [t.type, t.date, t.price ?? t.loan_amount, t.document_number].join('|')
}

function mergeTransactionHistory(existing: TransactionEvent[] | null, incoming: TransactionEvent[]): TransactionEvent[] {
  const map = new Map<string, TransactionEvent>()
  for (const t of existing ?? []) map.set(transactionKey(t), t)
  for (const t of incoming) {
    const key = transactionKey(t)
    const prev = map.get(key)
    map.set(key, prev ? { ...prev, ...t } : { ...t, source: t.source ?? 'public_record' })
  }
  return Array.from(map.values()).sort((a, b) => (b.date ?? '').localeCompare(a.date ?? ''))
}

function mergeAssessmentHistory(existing: AssessmentRow[] | null, incoming: AssessmentRow[]): AssessmentRow[] {
  const map = new Map<number, AssessmentRow>()
  for (const r of existing ?? []) {
    if (r.year != null) map.set(r.year, r)
  }
  for (const r of incoming) {
    if (r.year == null) continue
    const prev = map.get(r.year)
    map.set(r.year, prev ? { ...prev, ...r } : r)
  }
  return Array.from(map.values()).sort((a, b) => (b.year ?? 0) - (a.year ?? 0))
}

export async function mergePublicRecord(
  db: DB,
  args: { propertyId: string; payload: PublicRecordPayload }
): Promise<FieldsChanged> {
  const { propertyId, payload } = args

  const { data: existing } = await db
    .from('properties')
    .select('recorded_owner, owner_type, owner_mailing_address, subdivision, legal_description, census_tract, municipality, land_use, transaction_history, assessment_history')
    .eq('id', propertyId)
    .single()

  const update: PropertyUpdate = {}

  if (payload.recorded_owner) {
    const ro = payload.recorded_owner
    if (nullIfEmpty(ro.name)) update.recorded_owner = nullIfEmpty(ro.name)
    if (nullIfEmpty(ro.ownership_type)) update.owner_type = nullIfEmpty(ro.ownership_type)
    if (nullIfEmpty(ro.mailing_address)) update.owner_mailing_address = nullIfEmpty(ro.mailing_address)
  }
  if (nullIfEmpty(payload.subdivision)) update.subdivision = nullIfEmpty(payload.subdivision)
  if (nullIfEmpty(payload.legal_description)) update.legal_description = nullIfEmpty(payload.legal_description)
  if (nullIfEmpty(payload.census_tract)) update.census_tract = nullIfEmpty(payload.census_tract)
  if (nullIfEmpty(payload.municipality)) update.municipality = nullIfEmpty(payload.municipality)
  if (nullIfEmpty(payload.land_use)) update.land_use = nullIfEmpty(payload.land_use)

  if (payload.transaction_history && payload.transaction_history.length > 0) {
    const existingTx = (existing?.transaction_history as TransactionEvent[] | null) ?? null
    const merged = mergeTransactionHistory(existingTx, payload.transaction_history)
    update.transaction_history = merged
  }

  if (payload.assessment_history && payload.assessment_history.length > 0) {
    const existingAh = (existing?.assessment_history as AssessmentRow[] | null) ?? null
    const merged = mergeAssessmentHistory(existingAh, payload.assessment_history)
    update.assessment_history = merged
  }

  const changed = diff(existing as Record<string, unknown>, update as Record<string, unknown>)

  if (Object.keys(update).length > 0) {
    await db.from('properties').update(update).eq('id', propertyId)
  }

  return changed
}

// ============================================================
// merge: loan
// ============================================================

export type LoanEvent = {
  data_source?: string | null
  loan_type?: string | null
  origination_date?: string | null
  maturity_date?: string | null
  origination_amount?: number | null
  originator?: string | null
  borrower?: string | null
}

export type LoanPayload = {
  loan_events?: LoanEvent[]
}

export async function mergeLoan(
  db: DB,
  args: { propertyId: string; payload: LoanPayload }
): Promise<FieldsChanged> {
  const { propertyId, payload } = args

  if (!payload.loan_events || payload.loan_events.length === 0) return {}

  const { data: existing } = await db
    .from('properties')
    .select('transaction_history')
    .eq('id', propertyId)
    .single()

  const existingTx = (existing?.transaction_history as TransactionEvent[] | null) ?? []

  // map incoming loan events to TransactionEvent and merge into existing transaction_history
  const incoming: TransactionEvent[] = payload.loan_events.map(ev => ({
    type: 'loan',
    date: ev.origination_date ?? null,
    maturity_date: ev.maturity_date ?? null,
    loan_amount: ev.origination_amount ?? null,
    loan_type: ev.loan_type ?? null,
    originator: ev.originator ?? null,
    borrower: ev.borrower ?? null,
    data_source: ev.data_source ?? null,
    source: 'loan_tab',
  }))

  // match by (date, loan_amount) to enrich; otherwise append
  const merged = [...existingTx]
  for (const inc of incoming) {
    const idx = merged.findIndex(
      e => e.type === 'loan' && e.date === inc.date && (e.loan_amount ?? null) === (inc.loan_amount ?? null)
    )
    if (idx >= 0) {
      merged[idx] = { ...merged[idx], ...inc }
    } else {
      merged.push(inc)
    }
  }

  merged.sort((a, b) => (b.date ?? '').localeCompare(a.date ?? ''))

  const update: PropertyUpdate = { transaction_history: merged }
  const changed = diff(
    { transaction_history: existingTx } as Record<string, unknown>,
    update as Record<string, unknown>
  )
  await db.from('properties').update(update).eq('id', propertyId)
  return changed
}
