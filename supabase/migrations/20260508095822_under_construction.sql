-- Atlas Brief migration 0008: Under Construction status + expected delivery date
--
-- CoStar surfaces multifamily projects that are under construction.
-- Atlas Brief should track these with their expected delivery so
-- David can flag pending supply when commenting on submarket trends.

alter table listings
  drop constraint listings_status_check;

alter table listings
  add constraint listings_status_check
  check (status in ('for_sale', 'sold', 'off_market', 'under_construction'));

alter table listings
  add column expected_delivery_date date,
  add column expected_delivery_note text;
