-- Which article produced a signup.
--
-- `source` already records the capture SURFACE (article_modal, article_bar,
-- article_inline, home_dispatch_form). It does not record which piece the
-- reader was on, so there's no way to answer "what content converts" — David's
-- question. This column carries the article slug alongside it.
--
-- Separate column rather than encoding into `source`: keeping the surface
-- dimension clean means the existing per-surface comparison keeps working, and
-- the two can be crossed (which surface converts best, on which article).
--
-- Nullable by design. Signups from the homepage, the survival guide, and the
-- RSO briefing have no article behind them.
alter table public.subscribers
  add column if not exists source_slug text;

comment on column public.subscribers.source_slug is
  'Article slug the signup came from, when a capture surface on an article produced it. Null for homepage and lead-magnet signups.';

-- Reporting groups by this constantly and the table only grows.
create index if not exists subscribers_source_slug_idx
  on public.subscribers (source_slug)
  where source_slug is not null;
