-- Atlas Brief migration 0009: soft-delete on listings
--
-- David needs to delete listings (mostly test entries, occasional mistakes)
-- without losing the data for future analytics tables / aggregate metrics.
-- Soft-delete hides rows from the UI but keeps them queryable. All future
-- dashboard / analytics views must filter `deleted_at IS NULL` by default.

alter table listings
  add column deleted_at timestamptz,
  add column deleted_by uuid references auth.users(id);

create index listings_deleted_at_idx on listings (deleted_at);
