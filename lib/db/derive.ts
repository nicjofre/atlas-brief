// Derived fields computed at insert/update time.
// These are not extracted from CoStar/OM — they're computed from other fields.

const ULA_LOWER_THRESHOLD = 5_300_000
const ULA_UPPER_THRESHOLD = 10_300_000
const ULA_LOWER_RATE = 0.04
const ULA_UPPER_RATE = 0.055

export type DerivedListingFields = {
  rso_applicable: boolean | null
  ab1482_applicable: boolean | null
  ula_threshold_status: 'below' | 'at' | 'above' | null
  ula_tax_estimate: number | null
  bid_ask_delta: number | null
  implied_gross_annual_current: number | null
  implied_monthly_rent_current: number | null
}

export function deriveListingFields(input: {
  year_built: number | null
  list_price: number | null
  sale_price: number | null
  grm: number | null
  unit_count: number | null
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

  return {
    rso_applicable: rsoApplicable,
    ab1482_applicable: ab1482Applicable,
    ula_threshold_status: ulaThresholdStatus,
    ula_tax_estimate: ulaTaxEstimate,
    bid_ask_delta: bidAskDelta,
    implied_gross_annual_current: impliedGrossAnnual,
    implied_monthly_rent_current: impliedMonthlyRent,
  }
}
