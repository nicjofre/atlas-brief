-- Atlas Brief migration 0006: Sales Comp fields on listings
--
-- CoStar Sales Comp pages (sold deal detail) carry richer data than
-- the standard Property Summary export: true buyer/seller distinct
-- from recorded entities, hold period, sale notes narrative, initial
-- ask price, and buyer activity history.

alter table listings
  add column true_buyer text,
  add column buyer_contact text,
  add column buyer_phone text,
  add column buyer_origin text,
  add column buyer_type text,
  add column buyer_secondary_type text,
  add column buyer_activity_acquisitions numeric,
  add column buyer_activity_dispositions numeric,
  add column recorded_buyer text,
  add column true_seller text,
  add column seller_contact text,
  add column seller_phone text,
  add column seller_type text,
  add column seller_secondary_type text,
  add column recorded_seller text,
  add column hold_period_months int,
  add column sale_notes text,
  add column initial_ask_price numeric,
  add column price_status text,
  add column recording_date date,
  add column transfer_tax numeric,
  add column comp_status text,
  add column price_per_acre_land numeric,
  add column price_per_sf_land numeric;

-- Extend augmentation_log to allow Sales Comp paste types
alter table augmentation_log
  drop constraint augmentation_log_augment_type_check;

alter table augmentation_log
  add constraint augmentation_log_augment_type_check
  check (augment_type in ('contacts', 'public_record', 'loan', 'om', 'om_create', 'sale_comp', 'sale_comp_create'));
