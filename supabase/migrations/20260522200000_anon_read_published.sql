-- Atlas Brief migration: anon SELECT policies for published articles
--
-- The /atlas-brief routes serve unauthenticated visitors via the anon role.
-- The articles table already has an anon SELECT policy that filters to
-- status='published'. But the post page joins listings → properties →
-- brokers, and those tables are currently `to authenticated` only. Under
-- anon, the joins silently return NULL and the page renders empty.
--
-- This migration adds anon SELECT policies scoped to "rows referenced by
-- a published article". A listing/property/broker is anon-visible only
-- when at least one published, non-deleted article points to it. Drafts
-- and trashed content stay hidden.

create policy listings_anon_select_via_published_article on listings
  for select to anon
  using (
    exists (
      select 1 from articles
      where articles.listing_id = listings.id
        and articles.status = 'published'
        and articles.deleted_at is null
    )
  );

create policy properties_anon_select_via_published_article on properties
  for select to anon
  using (
    exists (
      select 1
      from articles a
      join listings l on l.id = a.listing_id
      where l.property_id = properties.id
        and a.status = 'published'
        and a.deleted_at is null
    )
  );

create policy brokers_anon_select_via_published_article on brokers
  for select to anon
  using (
    exists (
      select 1
      from articles a
      join listings l on l.id = a.listing_id
      where a.status = 'published'
        and a.deleted_at is null
        and (l.listing_broker_id = brokers.id or l.buyer_broker_id = brokers.id)
    )
  );

grant select on listings, properties, brokers to anon;
