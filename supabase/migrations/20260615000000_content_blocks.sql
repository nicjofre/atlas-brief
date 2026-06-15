-- Atlas Brief migration: editable page content blocks
--
-- The public About / Contact / Build pages render their copy from a registry
-- of named fields (lib/content-registry.ts). Each field ships with default
-- text baked into the code; this table holds David's per-field overrides,
-- edited through /admin/pages.
--
-- A row exists ONLY when a field has been overridden. getPageContent() reads
-- every override for a page in one query and falls back to the registry
-- default for any key without a row, so "Reset to default" simply deletes
-- the row. `key` matches the registry key (e.g. 'about.intro').
--
-- Written idempotently: the table was first created out-of-band during
-- development, so this migration reconciles it into version control and
-- pins the RLS policies as the source of truth on both fresh and existing DBs.

create table if not exists content_blocks (
  key text primary key,
  body text not null,
  updated_at timestamptz not null default now(),
  updated_by uuid references auth.users(id)
);

alter table content_blocks enable row level security;

-- Public pages render under the anon role and must read overrides.
drop policy if exists content_blocks_anon_select on content_blocks;
create policy content_blocks_anon_select on content_blocks
  for select to anon using (true);

-- Internal users edit copy through /admin/pages.
drop policy if exists content_blocks_authed_select on content_blocks;
create policy content_blocks_authed_select on content_blocks
  for select to authenticated using (true);

drop policy if exists content_blocks_authed_insert on content_blocks;
create policy content_blocks_authed_insert on content_blocks
  for insert to authenticated with check (true);

drop policy if exists content_blocks_authed_update on content_blocks;
create policy content_blocks_authed_update on content_blocks
  for update to authenticated using (true) with check (true);

drop policy if exists content_blocks_authed_delete on content_blocks;
create policy content_blocks_authed_delete on content_blocks
  for delete to authenticated using (true);

grant select on content_blocks to anon;
grant select, insert, update, delete on content_blocks to authenticated;
