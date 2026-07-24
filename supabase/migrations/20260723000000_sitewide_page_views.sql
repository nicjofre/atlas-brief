-- Atlas Brief migration: sitewide page views
--
-- post_views was article-only: every row carried a slug and (usually) an
-- article_id. We now record every PUBLIC page, so a row has to be able to
-- describe the home page, /tax-appeals, /rso-briefing and the rest — none of
-- which have a slug or an article behind them.
--
-- Rather than a second parallel table, widen this one:
--   path — the clean pathname ('/', '/tax-appeals', '/atlas-brief/some-deal').
--          Query strings are stripped so one page can't fragment into a dozen
--          near-identical rows; campaign info already lives in `source`.
--   kind — 'article' (a brief or a freeform post) or 'page' (everything else),
--          so the admin view can rank the two separately without pattern
--          matching on path.
--
-- Every existing row is an article read, so they backfill to /atlas-brief/<slug>
-- and keep the default kind. Internal tools (/analytics, /listings,
-- /development, /cms) are never recorded — see app/api/track/view/route.ts.

alter table post_views add column path text;
alter table post_views add column kind text not null default 'article';

update post_views set path = '/atlas-brief/' || slug where path is null;

-- `path` is deliberately left nullable so this migration is safe to apply
-- before the new code ships: the previous tracker inserts without a path, and
-- a NOT NULL here would make those writes fail during the deploy window. Every
-- row written from now on supplies it.

-- Non-article pages have no slug, so the original NOT NULL no longer holds.
alter table post_views alter column slug drop not null;

create index post_views_path_idx on post_views (path);
create index post_views_kind_idx on post_views (kind);