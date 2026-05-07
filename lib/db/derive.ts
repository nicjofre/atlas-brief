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
  const yearBuilt = input.year_built
  const rsoApplicable = yearBuilt != null ? yearBuilt <= 1978 : null
  const ab1482Applicable = yearBuilt != null ? !rsoApplicable : null

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
  status: 'for_sale' | 'sold' | 'off_market' | null
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
