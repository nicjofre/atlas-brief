-- Atlas Brief migration: post + email analytics
--
-- Two independent streams, both read by the admin Analytics view:
--   post_views   — on-site reads, written by a beacon from the public article
--                  page (anon). Insert-only for anon, no select (so the raw log
--                  stays private); admin reads aggregates.
--   email_events — Resend webhook events (delivered/opened/clicked/...). Written
--                  server-side from the signature-verified webhook via the
--                  direct DB connection, so NO anon access at all.

-- ---------- reader page views ----------
create table post_views (
  id uuid primary key default gen_random_uuid(),
  article_id uuid references articles(id) on delete set null,
  slug text not null,
  -- daily hash of ip+ua, for unique-ish counts without storing PII
  visitor_hash text,
  -- 'email' | 'direct' | 'social' | 'other'
  source text,
  referrer text,
  viewed_at timestamptz not null default now()
);
create index post_views_article_idx on post_views (article_id);
create index post_views_slug_idx on post_views (slug);
create index post_views_viewed_at_idx on post_views (viewed_at);

alter table post_views enable row level security;

-- The public article page tracks as the anon role: insert only, never read.
create policy post_views_anon_insert on post_views for insert to anon with check (true);
create policy post_views_authed_select on post_views for select to authenticated using (true);
grant insert on post_views to anon;
grant select on post_views to authenticated;

-- ---------- email engagement events ----------
create table email_events (
  id uuid primary key default gen_random_uuid(),
  -- delivered | opened | clicked | bounced | complained | sent | ...
  type text not null,
  email text,
  broadcast_id text,
  -- clicked link (for attributing clicks back to a deal)
  link text,
  resend_email_id text,
  raw jsonb,
  created_at timestamptz not null default now()
);
create index email_events_broadcast_idx on email_events (broadcast_id);
create index email_events_type_idx on email_events (type);
create index email_events_created_idx on email_events (created_at);

alter table email_events enable row level security;

-- Admin reads only. Writes come from the webhook over the direct DB connection
-- (service-level), so no anon/auth insert policy is granted on purpose.
create policy email_events_authed_select on email_events for select to authenticated using (true);
grant select on email_events to authenticated;
