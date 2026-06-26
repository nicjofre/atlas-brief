-- Atlas Brief migration: deal submissions ("submit a deal for an operator read")
--
-- The header "Submit a Deal" CTA opens a popup where brokers/owners send a deal
-- for David — an active LA owner-operator — to give his read. Same privacy
-- posture as `subscribers` / `tax_appeal_waitlist`: anon may INSERT only (never
-- read the list back), repeat-friendly (no unique constraint — the same person
-- may legitimately submit multiple deals).
--
-- See app/api/deals/submit/route.ts (capture) and
-- app/(frontend)/(public)/SubmitDealButton.tsx (header CTA + modal).

create table deal_submissions (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  email text not null,
  -- the deal itself: an address, a listing link, or a short description.
  deal text not null,
  note text,
  source text,
  created_at timestamptz not null default now()
);

alter table deal_submissions enable row level security;

-- Public form runs as anon: INSERT only, no SELECT (submissions stay private).
create policy deal_submissions_anon_insert on deal_submissions
  for insert to anon
  with check (true);

-- David / admin (authenticated) fully manages submissions.
create policy deal_submissions_authed_select on deal_submissions
  for select to authenticated using (true);
create policy deal_submissions_authed_insert on deal_submissions
  for insert to authenticated with check (true);
create policy deal_submissions_authed_update on deal_submissions
  for update to authenticated using (true) with check (true);
create policy deal_submissions_authed_delete on deal_submissions
  for delete to authenticated using (true);

-- Explicit grants (defense-in-depth). Anon INSERT only; no SELECT.
grant insert on deal_submissions to anon;
grant select, insert, update, delete on deal_submissions to authenticated;
