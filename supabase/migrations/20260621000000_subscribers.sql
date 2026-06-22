-- Atlas Brief migration: email subscribers (Friday dispatch)
--
-- We own the subscriber list in our own database (the durable record), and
-- mirror it to a Resend Audience (which handles delivery + hosted unsubscribe).
-- This table is the source of truth: every signup lands here first, and the
-- Resend contact id is stored back on the row once the sync succeeds. If the
-- Resend key isn't configured yet, rows still capture fine and can be
-- back-synced later.
--
-- See lib/resend.ts (sync helper) and app/api/subscribe/route.ts (capture).

create table subscribers (
  id uuid primary key default gen_random_uuid(),
  -- Stored already normalized (trimmed + lowercased) by the API, so a plain
  -- unique constraint is enough and ON CONFLICT (email) upserts work directly.
  email text not null unique,
  -- lifecycle: subscribed (active) | unsubscribed | bounced
  status text not null default 'subscribed'
    check (status in ('subscribed', 'unsubscribed', 'bounced')),
  -- where the signup came from (e.g. 'home_dispatch_form'); future-proofs
  -- multiple capture points without another column.
  source text,
  -- populated once the contact is mirrored into the Resend Audience.
  resend_contact_id text,
  unsubscribed_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table subscribers enable row level security;

-- The public dispatch form runs as the anon role. Anon may only INSERT a new
-- active subscription — never read the list back (emails stay private) and
-- never flip an existing row's status. The unique index + ON CONFLICT in the
-- API route handles repeat signups without leaking who is already on the list.
create policy subscribers_anon_insert on subscribers
  for insert to anon
  with check (status = 'subscribed');

-- David / admin (authenticated) fully manages the list and drives the send.
create policy subscribers_authed_select on subscribers
  for select to authenticated using (true);
create policy subscribers_authed_insert on subscribers
  for insert to authenticated with check (true);
create policy subscribers_authed_update on subscribers
  for update to authenticated using (true) with check (true);
create policy subscribers_authed_delete on subscribers
  for delete to authenticated using (true);

-- Explicit grants (defense-in-depth for Data API exposure). Anon gets INSERT
-- only; no SELECT, so the email list is not readable through the anon API.
grant insert on subscribers to anon;
grant select, insert, update, delete on subscribers to authenticated;
