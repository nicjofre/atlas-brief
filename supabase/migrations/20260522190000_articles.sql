-- Atlas Brief migration: articles
--
-- Editorial layer on top of listings. Every published post on /atlas-brief
-- is a row here, joined 1:1 to a listing. Listing-derived fields (price,
-- CAP, broker, photos, address) stay on listings/properties/brokers; only
-- the article-specific copy lives here (headline, deck, takeaways, body).
--
-- Headline supports a single *italic phrase* convention rather than full
-- markdown — David's headlines all follow the pattern "Address: N Doors at
-- *$306K a Unit.*" and the renderer can split on the asterisks.
--
-- Per-section entry numbering: "Entry № 02" within Broker Activity is
-- independent from "Entry № 01" within some future section, so the
-- uniqueness constraint is (section_slug, entry_num) rather than entry_num
-- alone.

create table articles (
  id uuid primary key default gen_random_uuid(),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  created_by uuid references auth.users(id),
  deleted_at timestamptz,

  -- relation
  listing_id uuid not null unique references listings(id) on delete cascade,

  -- routing
  slug text not null unique,

  -- classification
  section_slug text not null,
  entry_num int not null,
  tape_tier int check (tape_tier in (1, 2, 3) or tape_tier is null),

  -- workflow
  status text not null default 'draft' check (status in ('draft','ready','published')),
  published_at timestamptz,

  -- editorial copy
  headline text not null,
  deck text,
  excerpt text,
  status_tag text,
  hero_caption text,
  takeaways_subhead text,
  takeaways jsonb,
  body_md text,

  unique (section_slug, entry_num)
);

create index articles_section_idx on articles (section_slug);
create index articles_status_idx on articles (status);
create index articles_published_at_idx on articles (published_at desc);
create index articles_listing_idx on articles (listing_id);

-- ============================================================
-- updated_at trigger (same set_updated_at() function from initial schema)
-- ============================================================

create trigger articles_set_updated_at before update on articles
  for each row execute function set_updated_at();

-- ============================================================
-- soft-delete view — match the listings_active pattern so any future
-- query/dashboard can SELECT FROM articles_active and automatically skip
-- trashed rows. Direct reads of `articles` should only happen for the
-- Trash UI / audit use cases.
-- ============================================================

create view articles_active as
  select * from articles where deleted_at is null;

grant select on articles_active to authenticated;

-- ============================================================
-- row-level security — same shared-workspace model as the rest of the
-- schema: any authenticated user can read/write, public anon can only
-- SELECT published articles (so the /atlas-brief routes work without auth).
-- ============================================================

alter table articles enable row level security;

create policy articles_authed_select on articles
  for select to authenticated using (true);
create policy articles_authed_insert on articles
  for insert to authenticated with check (true);
create policy articles_authed_update on articles
  for update to authenticated using (true) with check (true);
create policy articles_authed_delete on articles
  for delete to authenticated using (true);

-- Public (anonymous) readers can see published, non-deleted articles only.
-- This is what powers the unauthenticated /atlas-brief pages.
create policy articles_anon_select_published on articles
  for select to anon
  using (status = 'published' and deleted_at is null);

grant usage on schema public to anon;
grant select on articles to anon;
grant select, insert, update, delete on articles to authenticated;
