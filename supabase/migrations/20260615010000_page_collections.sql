-- Atlas Brief migration: structured editable collections for public pages
--
-- Tier 2 of the page-content system. Where content_blocks holds flat
-- key -> string overrides for one-off prose, page_collections holds ordered
-- arrays of structured, repeatable items (e.g. the About page "Selected work"
-- projects, each with name / category / photo / stats / blurb).
--
-- `items` is a JSON array; the shape of each item is defined in code by the
-- matching CONTENT_COLLECTIONS entry in lib/content-registry.ts. A row exists
-- ONLY when the collection has been edited; getPageCollection() falls back to
-- the registry default items when no row is present, so "Reset" deletes the
-- row. `key` matches the registry collection key (e.g. 'about.projects').

create table if not exists page_collections (
  key text primary key,
  page text not null,
  items jsonb not null default '[]'::jsonb,
  updated_at timestamptz not null default now(),
  updated_by uuid references auth.users(id)
);

alter table page_collections enable row level security;

-- Public pages render under the anon role and must read collections.
drop policy if exists page_collections_anon_select on page_collections;
create policy page_collections_anon_select on page_collections
  for select to anon using (true);

-- Internal users edit collections through /admin/pages.
drop policy if exists page_collections_authed_select on page_collections;
create policy page_collections_authed_select on page_collections
  for select to authenticated using (true);

drop policy if exists page_collections_authed_insert on page_collections;
create policy page_collections_authed_insert on page_collections
  for insert to authenticated with check (true);

drop policy if exists page_collections_authed_update on page_collections;
create policy page_collections_authed_update on page_collections
  for update to authenticated using (true) with check (true);

drop policy if exists page_collections_authed_delete on page_collections;
create policy page_collections_authed_delete on page_collections
  for delete to authenticated using (true);

grant select on page_collections to anon;
grant select, insert, update, delete on page_collections to authenticated;
