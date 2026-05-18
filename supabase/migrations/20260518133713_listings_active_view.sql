-- Atlas Brief migration 0013: listings_active view
--
-- Bakes the soft-delete filter into a database view so that any
-- query against listings_active is guaranteed to exclude trashed
-- rows — no chance of an Explore query (or anything else) leaking
-- deleted listings via a forgotten WHERE clause.
--
-- security_invoker = true means RLS policies on the underlying
-- listings table still apply through the view (otherwise views run
-- as the view owner and bypass RLS). Postgres 15+.

create view listings_active
with (security_invoker = true)
as
  select * from listings
  where deleted_at is null;

grant select on listings_active to authenticated;
