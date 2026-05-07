-- Atlas Brief migration 0002: augmentation schema additions
--
-- Adds property fields captured from CoStar Contacts / Public Record / Loan tabs.
-- Replaces listings.sale_history with the richer properties.transaction_history.
-- Adds augmentation_log to track every paste-augmentation operation.

-- ============================================================
-- properties: owner detail + record metadata + history blobs
-- ============================================================

alter table properties
  add column owner_mailing_address text,
  add column recorded_owner_address text,
  add column recorded_owner_since date,
  add column true_owner_address text,
  add column true_owner_phone text,
  add column true_owner_since date,
  add column subdivision text,
  add column legal_description text,
  add column census_tract text,
  add column municipality text,
  add column land_use text,
  add column pm_address text,
  add column transaction_history jsonb,
  add column assessment_history jsonb;

-- ============================================================
-- listings: drop sale_history (moved to properties.transaction_history)
-- ============================================================

alter table listings drop column sale_history;

-- ============================================================
-- augmentation_log: audit trail for paste-augmentation operations
-- ============================================================

create table augmentation_log (
  id uuid primary key default gen_random_uuid(),
  created_at timestamptz not null default now(),
  created_by uuid references auth.users(id),
  listing_id uuid references listings(id) on delete cascade,
  property_id uuid references properties(id) on delete cascade,
  augment_type text not null check (augment_type in ('contacts', 'public_record', 'loan')),
  raw_text text not null,
  parsed_payload jsonb,
  fields_changed jsonb
);

create index augmentation_log_listing_idx on augmentation_log (listing_id);
create index augmentation_log_property_idx on augmentation_log (property_id);
create index augmentation_log_created_idx on augmentation_log (created_at desc);

alter table augmentation_log enable row level security;

create policy augmentation_log_authed_select on augmentation_log
  for select to authenticated using (true);
create policy augmentation_log_authed_insert on augmentation_log
  for insert to authenticated with check (true);
create policy augmentation_log_authed_update on augmentation_log
  for update to authenticated using (true) with check (true);
create policy augmentation_log_authed_delete on augmentation_log
  for delete to authenticated using (true);

grant select, insert, update, delete on augmentation_log to authenticated;
