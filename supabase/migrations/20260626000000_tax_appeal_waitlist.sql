-- Atlas Brief migration: tax-appeal service waitlist
--
-- The public /tax-appeals preview page collects "join the waitlist" interest
-- for the property-tax-appeal service (launching 2026). Same privacy posture as
-- `subscribers`: anon may INSERT only (never read the list back), repeat signups
-- resolve to a silent success via the unique email + ON CONFLICT in the API.
--
-- Kept separate from `subscribers` on purpose: this is service-lead interest
-- (with optional property context), not newsletter subscription.
--
-- See app/api/tax-appeals/waitlist/route.ts (capture) and
-- app/(frontend)/(public)/tax-appeals/WaitlistForm.tsx (form).

create table tax_appeal_waitlist (
  id uuid primary key default gen_random_uuid(),
  -- Stored already normalized (trimmed + lowercased) by the API.
  email text not null unique,
  -- Optional qualifying context captured on the form.
  name text,
  property text,
  -- where the signup came from; future-proofs additional capture points.
  source text,
  created_at timestamptz not null default now()
);

alter table tax_appeal_waitlist enable row level security;

-- Public form runs as anon: INSERT only, no SELECT (the list stays private).
create policy tax_waitlist_anon_insert on tax_appeal_waitlist
  for insert to anon
  with check (true);

-- David / admin (authenticated) fully manages the list.
create policy tax_waitlist_authed_select on tax_appeal_waitlist
  for select to authenticated using (true);
create policy tax_waitlist_authed_insert on tax_appeal_waitlist
  for insert to authenticated with check (true);
create policy tax_waitlist_authed_update on tax_appeal_waitlist
  for update to authenticated using (true) with check (true);
create policy tax_waitlist_authed_delete on tax_appeal_waitlist
  for delete to authenticated using (true);

-- Explicit grants (defense-in-depth). Anon INSERT only; no SELECT.
grant insert on tax_appeal_waitlist to anon;
grant select, insert, update, delete on tax_appeal_waitlist to authenticated;
