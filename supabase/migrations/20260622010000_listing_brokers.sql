-- Atlas Brief migration: listing_brokers join table (many brokers per deal)
--
-- The two FK columns (listings.listing_broker_id / buyer_broker_id) assume one
-- agent per side. Real CoStar deals routinely carry co-listing TEAMS (two+
-- agents on one side) and dual-agency (one agent repping both sides). This join
-- table lets a listing hold any number of brokers, each tagged with a side, so
-- the article card can group + label them faithfully:
--   - co-listing team   -> multiple rows, role='listing'
--   - dual agency       -> same broker_id with both a 'listing' and 'buyer' row
--   - buyer side         -> role='buyer'
-- The FK columns stay as the "lead contact per side" (used by the dispatch
-- email teaser and admin summaries); this table is the full roster.

create table listing_brokers (
  id uuid primary key default gen_random_uuid(),
  listing_id uuid not null references listings(id) on delete cascade,
  broker_id uuid not null references brokers(id) on delete cascade,
  -- which side of the deal this broker is on
  role text not null check (role in ('listing', 'buyer')),
  -- order within a side (lead agent first)
  sort_order int not null default 0,
  created_at timestamptz not null default now(),
  unique (listing_id, broker_id, role)
);
create index listing_brokers_listing_id_idx on listing_brokers (listing_id);
create index listing_brokers_broker_id_idx on listing_brokers (broker_id);

alter table listing_brokers enable row level security;

-- David / admin fully manages the roster.
create policy listing_brokers_authed_select on listing_brokers for select to authenticated using (true);
create policy listing_brokers_authed_insert on listing_brokers for insert to authenticated with check (true);
create policy listing_brokers_authed_update on listing_brokers for update to authenticated using (true) with check (true);
create policy listing_brokers_authed_delete on listing_brokers for delete to authenticated using (true);

-- Public article pages (anon role) may read the roster for any listing that a
-- published, non-deleted article points to — mirrors the existing
-- listings/properties/brokers anon-read pattern.
create policy listing_brokers_anon_select_via_published_article on listing_brokers
  for select to anon
  using (
    exists (
      select 1 from articles a
      where a.listing_id = listing_brokers.listing_id
        and a.status = 'published'
        and a.deleted_at is null
    )
  );

grant select on listing_brokers to anon;
grant select, insert, update, delete on listing_brokers to authenticated;

-- A broker is now anon-visible if a published article's listing references them
-- via EITHER the FK columns OR the new join table. Without this, co-listing
-- teammates added only to the join table would be silently null on the public
-- page (RLS would hide the broker row).
drop policy brokers_anon_select_via_published_article on brokers;
create policy brokers_anon_select_via_published_article on brokers
  for select to anon
  using (
    exists (
      select 1
      from articles a
      join listings l on l.id = a.listing_id
      where a.status = 'published'
        and a.deleted_at is null
        and (
          l.listing_broker_id = brokers.id
          or l.buyer_broker_id = brokers.id
          or exists (
            select 1 from listing_brokers lb
            where lb.listing_id = l.id and lb.broker_id = brokers.id
          )
        )
    )
  );

-- Backfill the join table from the existing FK columns so every current deal
-- keeps its brokers. Dual-agency (same broker in both FKs) lands as two rows
-- (one 'listing', one 'buyer'), which the card renders as a single
-- "Buyer & Listing Broker".
insert into listing_brokers (listing_id, broker_id, role, sort_order)
select id, listing_broker_id, 'listing', 0
from listings where listing_broker_id is not null
on conflict do nothing;

insert into listing_brokers (listing_id, broker_id, role, sort_order)
select id, buyer_broker_id, 'buyer', 0
from listings where buyer_broker_id is not null
on conflict do nothing;
