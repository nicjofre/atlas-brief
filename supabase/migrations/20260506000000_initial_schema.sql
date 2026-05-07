-- Atlas Brief: initial relational schema
-- Tables: properties, listings, brokers
-- Entries (articles) deferred to a later migration

-- gen_random_uuid() is built into Postgres 13+, no extension required

-- ============================================================
-- properties
-- ============================================================

create table properties (
  id uuid primary key default gen_random_uuid(),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  created_by uuid references auth.users(id),
  last_costar_parsed_at timestamptz,

  -- identification
  apn text,
  costar_property_id text,
  street_address text,
  city text,
  state text,
  zip text,
  county text,
  market text,
  submarket text,
  submarket_cluster text,
  neighborhood text,
  cbsa text,
  dma text,
  location_type text,
  lat numeric,
  lng numeric,
  cross_streets text,

  -- building physical
  year_built int,
  year_renovated int,
  unit_count int,
  gross_sf numeric,
  avg_unit_sf numeric,
  lot_sf numeric,
  land_acres numeric,
  stories int,
  building_count int,
  units_per_acre numeric,
  bldg_far numeric,
  construction_type text,
  architectural_notes text,
  elevators text,
  walk_up boolean,
  metering text,
  zoning text,
  parking_type text,
  parking_count int,
  property_type text,
  property_class text check (property_class in ('A','B','C') or property_class is null),
  star_rating numeric,
  market_segment text,
  rent_type text,
  typical_floor_sf numeric,

  -- ownership
  recorded_owner text,
  true_owner text,
  owner_type text,
  property_manager text,
  pm_phone text,
  pm_since text,
  mls_number text,

  -- public record
  assessed_total numeric,
  assessed_improvements numeric,
  assessed_land numeric,
  assessment_year int,
  annual_tax numeric,
  tax_per_unit numeric,
  tax_year int,

  -- FEMA
  flood_risk_area text,
  flood_zone text,
  in_sfha boolean,
  fema_map_id text,
  fema_map_date text,

  -- walk/transit scores
  pedestrian_score numeric,
  cycling_score numeric,
  car_score numeric,
  transit_score numeric,
  walk_score numeric,
  bike_score numeric,

  -- capex / amenities / notes
  soft_story_retrofit boolean,
  value_add_notes text,
  capital_improvements text,
  amenities text[],
  building_notes text,
  sale_highlights text,

  -- market context (snapshot from CoStar)
  vacancy_rate_subject numeric,
  vacancy_rate_submarket numeric,
  vacancy_rate_market numeric,
  market_rent_subject numeric,
  market_rent_submarket numeric,
  market_rent_market numeric,
  concessions_subject numeric,
  concessions_submarket numeric,
  concessions_market numeric,
  under_construction_units_market int,
  twelve_mo_sales_volume_submarket numeric,
  market_sales_price_per_unit numeric,

  -- jsonb blobs
  demographics_1mi jsonb,
  demographics_3mi jsonb,
  transit_stations jsonb,
  airports jsonb
);

create unique index properties_apn_uniq on properties (apn) where apn is not null;
create unique index properties_address_uniq on properties (
  lower(street_address), lower(city), state, zip
) where street_address is not null;
create index properties_submarket_idx on properties (submarket);
create index properties_market_idx on properties (market);
create index properties_year_built_idx on properties (year_built);
create index properties_unit_count_idx on properties (unit_count);

-- ============================================================
-- brokers
-- ============================================================

create table brokers (
  id uuid primary key default gen_random_uuid(),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),

  -- identity
  name text,
  title text,
  firm text,
  team text,
  phone text,
  cell text,
  email text,
  dre_license text,
  office_address text,
  profile_url text,
  linkedin text,
  headshot_url text,

  -- tracked-broker profile (filled in when promoted)
  is_tracked boolean not null default false,
  bio text,
  volume_closed text,
  focus_areas text[],
  podcast_name text,
  podcast_url text,
  years_active int,
  start_year int,
  tracked_since date
);

create unique index brokers_email_uniq on brokers (lower(email)) where email is not null;
create unique index brokers_dre_uniq on brokers (dre_license) where dre_license is not null;
create index brokers_firm_idx on brokers (firm);
create index brokers_name_firm_idx on brokers (lower(name), lower(firm));

-- ============================================================
-- listings
-- ============================================================

create table listings (
  id uuid primary key default gen_random_uuid(),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  created_by uuid references auth.users(id),
  last_om_parsed_at timestamptz,

  property_id uuid not null references properties(id) on delete cascade,
  status text check (status in ('for_sale','sold','off_market')),

  -- pricing
  list_price numeric,
  list_date date,
  sale_price numeric,
  sale_date date,
  sale_type text,
  price_per_unit numeric,
  price_per_sf numeric,
  bid_ask_delta numeric,

  -- yield (split current vs market)
  cap_rate_current numeric,
  cap_rate_market numeric,
  grm_current numeric,
  grm_market numeric,
  noi_current numeric,
  implied_gross_annual_current numeric,
  implied_gross_annual_market numeric,
  implied_monthly_rent_current numeric,
  implied_monthly_rent_market numeric,
  expense_ratio numeric,

  -- brokers
  listing_broker_id uuid references brokers(id),
  buyer_broker_id uuid references brokers(id),

  -- loan (deal-specific)
  loan_amount numeric,
  loan_origination_date date,
  loan_maturity_date date,
  lender text,
  borrower text,
  loan_type text,
  loan_doc_number text,

  -- derived (computed in app code at insert/update)
  rso_applicable boolean,
  ab1482_applicable boolean,
  ula_threshold_status text check (ula_threshold_status in ('below','at','above') or ula_threshold_status is null),
  ula_tax_estimate numeric,

  -- structured data
  unit_mix jsonb,
  unit_mix_updated date,
  in_unit_features text[],
  rent_roll jsonb,
  t12 jsonb,
  om_highlights text[],
  marketing_quotes jsonb,
  photos jsonb,
  hero_photo_index int,
  sale_history jsonb
);

create index listings_property_idx on listings (property_id);
create index listings_status_idx on listings (status);
create index listings_sale_date_idx on listings (sale_date);
create index listings_list_date_idx on listings (list_date);
create index listings_listing_broker_idx on listings (listing_broker_id);
create index listings_buyer_broker_idx on listings (buyer_broker_id);

-- ============================================================
-- updated_at triggers
-- ============================================================

create or replace function set_updated_at() returns trigger language plpgsql as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

create trigger properties_set_updated_at before update on properties
  for each row execute function set_updated_at();
create trigger listings_set_updated_at before update on listings
  for each row execute function set_updated_at();
create trigger brokers_set_updated_at before update on brokers
  for each row execute function set_updated_at();

-- ============================================================
-- row-level security
-- shared workspace: any authenticated user can read/write
-- ============================================================

alter table properties enable row level security;
alter table listings enable row level security;
alter table brokers enable row level security;

create policy properties_authed_select on properties for select to authenticated using (true);
create policy properties_authed_insert on properties for insert to authenticated with check (true);
create policy properties_authed_update on properties for update to authenticated using (true) with check (true);
create policy properties_authed_delete on properties for delete to authenticated using (true);

create policy listings_authed_select on listings for select to authenticated using (true);
create policy listings_authed_insert on listings for insert to authenticated with check (true);
create policy listings_authed_update on listings for update to authenticated using (true) with check (true);
create policy listings_authed_delete on listings for delete to authenticated using (true);

create policy brokers_authed_select on brokers for select to authenticated using (true);
create policy brokers_authed_insert on brokers for insert to authenticated with check (true);
create policy brokers_authed_update on brokers for update to authenticated using (true) with check (true);
create policy brokers_authed_delete on brokers for delete to authenticated using (true);

-- ============================================================
-- explicit table grants (defense-in-depth for Data API exposure)
-- ============================================================

grant usage on schema public to authenticated;
grant select, insert, update, delete on properties to authenticated;
grant select, insert, update, delete on listings to authenticated;
grant select, insert, update, delete on brokers to authenticated;
