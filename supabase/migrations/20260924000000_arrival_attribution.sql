-- Where readers and subscribers come from, and what the signup pop-up does.
--
-- The Sep 2026 traffic review hit three blind spots:
--   1. post_views kept a five-way `source` bucket and nothing else. The query
--      string was stripped on the assumption that `source` held the campaign;
--      it didn't, so a paid Instagram click and a David post were the same row.
--   2. subscribers recorded which form they used (`source`) but not how they
--      reached the site, so "which channel produces subscribers" could only be
--      estimated by matching signup times to page views.
--   3. The pop-up logged only successful signups, so shown / dismissed rates —
--      the numbers needed to tune it — didn't exist anywhere.
--
-- `channel` is derived server-side by lib/analytics/channel.ts (LinkedIn,
-- Instagram, Facebook, Meta, Search, X, TikTok, Google display, Email, Direct,
-- Other). `paid` is whether the click carried an ad click id or a paid
-- utm_medium. Everything is nullable: rows before this migration have none of
-- it, and a browser that blocks cookies stays unknown rather than Direct.

-- 1. page views: the arrival, in full, on the first page of a visit
alter table public.post_views
  add column if not exists channel text,
  add column if not exists paid boolean,
  add column if not exists utm_source text,
  add column if not exists utm_medium text,
  add column if not exists utm_campaign text,
  add column if not exists utm_content text,
  add column if not exists ad_click text;

comment on column public.post_views.channel is
  'Arrival channel for the first page of a visit (null on internal clicks and on rows before 2026-09-24).';
comment on column public.post_views.ad_click is
  'Name of the ad click id on the landing URL (gclid, fbclid, ...). The id value itself is not stored.';

create index if not exists post_views_channel_idx
  on public.post_views (channel)
  where channel is not null;

-- 2. subscribers: first and last outside arrival before signing up
alter table public.subscribers
  add column if not exists first_touch jsonb,
  add column if not exists last_touch jsonb,
  add column if not exists first_channel text,
  add column if not exists first_paid boolean,
  add column if not exists last_channel text,
  add column if not exists last_paid boolean;

comment on column public.subscribers.first_touch is
  'How this browser first reached the site: referrer host, utm_*, ad click id name, landing path, time.';
comment on column public.subscribers.last_touch is
  'Most recent outside arrival before signup (bare direct visits do not overwrite it).';

-- 3. signup pop-up events
create table if not exists public.capture_events (
  id uuid primary key default gen_random_uuid(),
  created_at timestamptz not null default now(),
  surface text not null,
  event text not null check (event in ('shown', 'dismissed', 'submitted')),
  trigger text check (trigger in ('scroll', 'nav')),
  how text check (how in ('close', 'skip', 'backdrop', 'escape')),
  path text,
  slug text,
  visitor_hash text,
  channel text,
  paid boolean
);

comment on table public.capture_events is
  'Signup pop-up shown / dismissed / submitted. shown→submitted is its conversion rate; dismissed by `how` is its annoyance rate.';

create index if not exists capture_events_created_at_idx
  on public.capture_events (created_at);

-- Same shape as post_views: the public beacon can only add rows, staff can read.
alter table public.capture_events enable row level security;

create policy capture_events_anon_insert on public.capture_events
  for insert to anon with check (true);

create policy capture_events_authed_select on public.capture_events
  for select to authenticated using (true);
