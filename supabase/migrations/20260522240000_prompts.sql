-- Atlas Brief migration: editable prompt sections
--
-- The article-generation system prompt is composed from named sections that
-- David edits directly through /admin/prompts. The API route assembles all
-- rows in a defined order at generation time, so a section edit takes effect
-- on the next draft without a code deploy.
--
-- version_history stores prior bodies as {body, at, by} jsonb entries,
-- newest-first. Each save prepends; David can revert one click later.

create table prompts (
  id uuid primary key default gen_random_uuid(),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  updated_by uuid references auth.users(id),

  key text not null unique,
  body text not null,
  description text,
  sort_order int not null default 0,
  version_history jsonb not null default '[]'::jsonb
);

create index prompts_key_idx on prompts (key);
create index prompts_sort_idx on prompts (sort_order);

create trigger prompts_set_updated_at before update on prompts
  for each row execute function set_updated_at();

alter table prompts enable row level security;

-- Authenticated workspace pattern — David (and other internal users) can
-- read/write. anon has no access.
create policy prompts_authed_select on prompts
  for select to authenticated using (true);
create policy prompts_authed_insert on prompts
  for insert to authenticated with check (true);
create policy prompts_authed_update on prompts
  for update to authenticated using (true) with check (true);
create policy prompts_authed_delete on prompts
  for delete to authenticated using (true);

grant select, insert, update, delete on prompts to authenticated;
