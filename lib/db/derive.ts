// Derived fields computed at insert/update time.
// These are not extracted from CoStar/OM — they're computed from other fields.

const ULA_LOWER_THRESHOLD = 5_300_000
const ULA_UPPER_THRESHOLD = 10_300_000
const ULA_LOWER_RATE = 0.04
const ULA_UPPER_RATE = 0.055
const SF_PER_ACRE = 43_560

export type DerivedListingFields = {
  rso_applicable: boolean | null
  ab1482_applicable: boolean | null
  ula_threshold_status: 'below' | 'at' | 'above' | null
  ula_tax_estimate: number | null
  bid_ask_delta: number | null
  implied_gross_annual_current: number | null
  implied_monthly_rent_current: number | null
  price_per_unit: number | null
  price_per_sf: number | null
}

export type DerivedPropertyFields = {
  avg_unit_sf: number | null
  units_per_acre: number | null
  bldg_far: number | null
  land_acres: number | null
  land_sf: number | null
}

export function deriveListingFields(input: {
  year_built: number | null
  list_price: number | null
  sale_price: number | null
  grm: number | null
  unit_count: number | null
  building_sf: number | null
  price_per_unit: number | null
  price_per_sf: number | null
}): DerivedListingFields {
  // RSO applies to multifamily built on or before Oct 1, 1978 (LA city).
  // AB 1482 applies to most rental housing built at least 15 years ago,
  // unless RSO already covers it. Buildings less than 15 years old are
  // generally Exempt from both (the AB 1482 carve-out for new construction).
  const yearBuilt = input.year_built
  const currentYear = new Date().getFullYear()
  const rsoApplicable = yearBuilt != null ? yearBuilt <= 1978 : null
  const ab1482Applicable =
    yearBuilt != null
      ? yearBuilt > 1978 && currentYear - yearBuilt >= 15
      : null

  const refPrice = input.sale_price ?? input.list_price

  let ulaThresholdStatus: DerivedListingFields['ula_threshold_status'] = null
  let ulaTaxEstimate: number | null = null
  if (refPrice != null) {
    if (refPrice < ULA_LOWER_THRESHOLD) ulaThresholdStatus = 'below'
    else if (refPrice === ULA_LOWER_THRESHOLD) ulaThresholdStatus = 'at'
    else ulaThresholdStatus = 'above'

    if (refPrice >= ULA_UPPER_THRESHOLD) ulaTaxEstimate = refPrice * ULA_UPPER_RATE
    else if (refPrice >= ULA_LOWER_THRESHOLD) ulaTaxEstimate = refPrice * ULA_LOWER_RATE
  }

  let bidAskDelta: number | null = null
  if (input.list_price != null && input.sale_price != null) {
    bidAskDelta = input.list_price - input.sale_price
  }

  let impliedGrossAnnual: number | null = null
  let impliedMonthlyRent: number | null = null
  if (refPrice != null && input.grm != null && input.grm > 0) {
    impliedGrossAnnual = refPrice / input.grm
    if (input.unit_count != null && input.unit_count > 0) {
      impliedMonthlyRent = impliedGrossAnnual / input.unit_count / 12
    }
  }

  // price_per_unit: prefer extracted, derive if missing
  let pricePerUnit = input.price_per_unit
  if (pricePerUnit == null && refPrice != null && input.unit_count != null && input.unit_count > 0) {
    pricePerUnit = refPrice / input.unit_count
  }

  // price_per_sf: prefer extracted, derive if missing
  let pricePerSf = input.price_per_sf
  if (pricePerSf == null && refPrice != null && input.building_sf != null && input.building_sf > 0) {
    pricePerSf = refPrice / input.building_sf
  }

  return {
    rso_applicable: rsoApplicable,
    ab1482_applicable: ab1482Applicable,
    ula_threshold_status: ulaThresholdStatus,
    ula_tax_estimate: ulaTaxEstimate,
    bid_ask_delta: bidAskDelta,
    implied_gross_annual_current: impliedGrossAnnual,
    implied_monthly_rent_current: impliedMonthlyRent,
    price_per_unit: pricePerUnit,
    price_per_sf: pricePerSf,
  }
}

export function derivePropertyFields(input: {
  unit_count: number | null
  gross_sf: number | null
  land_acres: number | null
  land_sf: number | null
  avg_unit_sf: number | null
  units_per_acre: number | null
  bldg_far: number | null
}): DerivedPropertyFields {
  // land conversions: fill whichever of acres/sf is missing
  let landAcres = input.land_acres
  let landSf = input.land_sf
  if (landAcres == null && landSf != null && landSf > 0) {
    landAcres = landSf / SF_PER_ACRE
  }
  if (landSf == null && landAcres != null && landAcres > 0) {
    landSf = landAcres * SF_PER_ACRE
  }

  // avg_unit_sf: derive from gross_sf / unit_count when missing
  let avgUnitSf = input.avg_unit_sf
  if (avgUnitSf == null && input.gross_sf != null && input.unit_count != null && input.unit_count > 0) {
    avgUnitSf = input.gross_sf / input.unit_count
  }

  // units_per_acre: derive from unit_count / land_acres when missing
  let unitsPerAcre = input.units_per_acre
  if (unitsPerAcre == null && input.unit_count != null && landAcres != null && landAcres > 0) {
    unitsPerAcre = input.unit_count / landAcres
  }

  // bldg_far: derive from gross_sf / land_sf when missing
  let bldgFar = input.bldg_far
  if (bldgFar == null && input.gross_sf != null && landSf != null && landSf > 0) {
    bldgFar = input.gross_sf / landSf
  }

  return {
    avg_unit_sf: avgUnitSf,
    units_per_acre: unitsPerAcre,
    bldg_far: bldgFar,
    land_acres: landAcres,
    land_sf: landSf,
  }
}

export type CapGrmSources = {
  cap_rate_current_source: 'stated' | 'at_close' | 'proforma' | null
  cap_rate_market_source: 'stated' | 'at_close' | 'proforma' | null
  grm_current_source: 'stated' | 'at_close' | 'proforma' | null
  grm_market_source: 'stated' | 'at_close' | 'proforma' | null
}

// CoStar parser: sold listings have at-close numbers; for-sale are broker-stated
export function costarSources(args: {
  status: 'for_sale' | 'sold' | 'off_market' | 'under_construction' | null
  cap_rate: number | null
  grm: number | null
}): CapGrmSources {
  const isSold = args.status === 'sold'
  const tag: 'stated' | 'at_close' = isSold ? 'at_close' : 'stated'
  return {
    cap_rate_current_source: args.cap_rate != null ? tag : null,
    cap_rate_market_source: null,
    grm_current_source: args.grm != null ? tag : null,
    grm_market_source: null,
  }
}

// OM parser: current = broker-stated, market = broker-proforma
export function omSources(args: {
  cap_rate_current: number | null
  cap_rate_market: number | null
  grm_current: number | null
  grm_market: number | null
}): CapGrmSources {
  return {
    cap_rate_current_source: args.cap_rate_current != null ? 'stated' : null,
    cap_rate_market_source: args.cap_rate_market != null ? 'proforma' : null,
    grm_current_source: args.grm_current != null ? 'stated' : null,
    grm_market_source: args.grm_market != null ? 'proforma' : null,
  }
}

// ============================================================
// Display-side derived helpers
// ============================================================

export type RentRegulation = 'RSO' | 'AB 1482 Only' | 'Exempt'

/** Single label combining RSO + AB1482 booleans into one human-readable status.
 *  A manual override always wins over the derived value. */
export function rentRegulationLabel(args: {
  rso_applicable: boolean | null
  ab1482_applicable: boolean | null
  override?: string | null
}): RentRegulation | null {
  if (args.override === 'RSO' || args.override === 'AB 1482 Only' || args.override === 'Exempt') {
    return args.override
  }
  if (args.rso_applicable === true) return 'RSO'
  if (args.ab1482_applicable === true) return 'AB 1482 Only'
  if (args.rso_applicable === false && args.ab1482_applicable === false) return 'Exempt'
  return null
}

/** Parking spaces per residential unit. */
export function parkingRatio(args: {
  parking_count: number | null
  unit_count: number | null
}): number | null {
  if (args.parking_count == null || args.unit_count == null || args.unit_count <= 0) return null
  return args.parking_count / args.unit_count
}

/** Days from list_date to sale_date (sold) or to today (for_sale). */
export function daysOnMarket(args: {
  list_date: string | null
  sale_date: string | null
  status: string | null
}): number | null {
  if (!args.list_date) return null
  const list = new Date(args.list_date).getTime()
  if (isNaN(list)) return null
  const end = args.sale_date
    ? new Date(args.sale_date).getTime()
    : args.status === 'for_sale'
    ? Date.now()
    : NaN
  if (isNaN(end)) return null
  const days = Math.round((end - list) / (1000 * 60 * 60 * 24))
  return days < 0 ? 0 : days
}

/** Aggregate rent spread / loss-to-lease across the unit_mix. */
export type RentSpread = {
  total_current_monthly: number | null
  total_market_monthly: number | null
  loss_to_lease_monthly: number | null
  loss_to_lease_pct: number | null
  total_units_with_rent: number
}
type UnitMixRow = {
  units?: number | null
  current_avg_rent?: number | null
  market_avg_rent?: number | null
}
export function rentSpread(unitMix: unknown): RentSpread | null {
  if (!Array.isArray(unitMix) || unitMix.length === 0) return null
  let totalCurrent = 0
  let totalMarket = 0
  let totalUnits = 0
  let hasAny = false
  for (const row of unitMix as UnitMixRow[]) {
    const units = row.units ?? 0
    const cur = row.current_avg_rent ?? null
    const mkt = row.market_avg_rent ?? null
    if (units > 0 && cur != null && mkt != null) {
      totalCurrent += units * cur
      totalMarket += units * mkt
      totalUnits += units
      hasAny = true
    }
  }
  if (!hasAny || totalUnits === 0) return null
  const lossToLease = totalMarket - totalCurrent
  const pct = totalMarket > 0 ? (lossToLease / totalMarket) * 100 : null
  return {
    total_current_monthly: totalCurrent,
    total_market_monthly: totalMarket,
    loss_to_lease_monthly: lossToLease,
    loss_to_lease_pct: pct,
    total_units_with_rent: totalUnits,
  }
}

/** Most recent sale event in transaction_history that pre-dates the current listing's sale_date. */
export type PriorSale = {
  date: string | null
  price: number | null
  buyer: string | null
  seller: string | null
  hold_period_years: number | null
}
type TransactionHistoryRow = {
  type?: string | null
  date?: string | null
  price?: number | null
  buyer?: string | null
  seller?: string | null
  buyers?: string[] | null
  sellers?: string[] | null
}
export function priorSale(args: {
  transaction_history: unknown
  current_sale_date: string | null
}): PriorSale | null {
  if (!Array.isArray(args.transaction_history) || args.transaction_history.length === 0) return null
  const sales = (args.transaction_history as TransactionHistoryRow[])
    .filter(r => r.type === 'sale' && r.date)
    .filter(r => !args.current_sale_date || r.date! < args.current_sale_date)
    .sort((a, b) => (b.date ?? '').localeCompare(a.date ?? ''))
  if (sales.length === 0) return null
  const top = sales[0]
  let holdPeriodYears: number | null = null
  if (args.current_sale_date && top.date) {
    const a = new Date(top.date).getTime()
    const b = new Date(args.current_sale_date).getTime()
    if (!isNaN(a) && !isNaN(b)) {
      holdPeriodYears = Math.round(((b - a) / (1000 * 60 * 60 * 24 * 365.25)) * 10) / 10
    }
  }
  return {
    date: top.date ?? null,
    price: top.price ?? null,
    buyer: top.buyer ?? ((top.buyers ?? []).join('; ') || null),
    seller: top.seller ?? ((top.sellers ?? []).join('; ') || null),
    hold_period_years: holdPeriodYears,
  }
}
