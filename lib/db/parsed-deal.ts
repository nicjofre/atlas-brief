// Shape returned by the Claude parser. Mirrors the SYSTEM_PROMPT in app/api/parse/route.ts.
// Kept separate from the DB row types so we can evolve the parser independently.

export type SaleHistoryRow = {
  date: string | null
  type: string | null
  price: number | null
  units: number | null
  price_per_unit: number | null
  cap_rate: number | null
  buyer: string | null
  seller: string | null
}

export type UnitMixRow = {
  bed_type: string | null
  units: number | null
  avg_sf: number | null
  asking_rent_per_unit: number | null
  asking_rent_per_sf: number | null
  concessions_pct: number | null
}

export type Demographics = {
  population: number | null
  households: number | null
  median_age: number | null
  median_hh_income: number | null
  daytime_employees: number | null
  population_growth_5y: number | null
  household_growth_5y: number | null
} | null

export type TransitRow = {
  name: string | null
  type: string | null
  drive_min: number | null
  walk_min: number | null
  distance_mi: number | null
}

export type AirportRow = {
  name: string | null
  drive_min: number | null
  distance_mi: number | null
}

export type ParsedDeal = {
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

  // Sales Comp / sold-deal fields (populated when parsing a Sales Comp page)
  recorded_buyer: string | null
  true_buyer: string | null
  buyer_contact: string | null
  buyer_phone: string | null
  buyer_origin: string | null
  buyer_type: string | null
  buyer_secondary_type: string | null
  buyer_activity_acquisitions: number | null
  buyer_activity_dispositions: number | null
  recorded_seller: string | null
  true_seller: string | null
  seller_contact: string | null
  seller_phone: string | null
  seller_type: string | null
  seller_secondary_type: string | null
  hold_period_months: number | null
  sale_notes: string | null
  initial_ask_price: number | null
  price_status: string | null
  recording_date: string | null
  transfer_tax: number | null
  comp_status: string | null
  price_per_acre_land: number | null
  price_per_sf_land: number | null

  // Buyer broker (separate from listing broker)
  buyer_broker_name: string | null
  buyer_broker_firm: string | null
  buyer_broker_phone: string | null
  buyer_broker_cell: string | null
  buyer_broker_email: string | null
  buyer_broker_license: string | null

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
