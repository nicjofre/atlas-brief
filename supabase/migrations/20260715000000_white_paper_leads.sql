-- Atlas Brief migration: white-paper lead capture
--
-- The public /survival-guide landing page gates the "Atlas Brief Survival Guide"
-- PDF behind a short form. Same privacy posture as subscribers /
-- tax_appeal_waitlist / deal_submissions: anon may INSERT only (never read the
-- list back). No dedup — the same person may request it more than once.
--
-- See app/api/white-paper/lead/route.ts (capture) and
-- app/(frontend)/(public)/survival-guide/ (landing page + form).

create table white_paper_leads (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  email text not null,
  company text,
  source text,
  created_at timestamptz not null default now()
);

alter table white_paper_leads enable row level security;

create policy white_paper_leads_anon_insert on white_paper_leads
  for insert to anon with check (true);

create policy white_paper_leads_authed_select on white_paper_leads
  for select to authenticated using (true);
create policy white_paper_leads_authed_insert on white_paper_leads
  for insert to authenticated with check (true);
create policy white_paper_leads_authed_update on white_paper_leads
  for update to authenticated using (true) with check (true);
create policy white_paper_leads_authed_delete on white_paper_leads
  for delete to authenticated using (true);

grant insert on white_paper_leads to anon;
grant select, insert, update, delete on white_paper_leads to authenticated;
