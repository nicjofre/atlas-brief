-- Atlas Brief migration: store article body and deal-stats grid as raw HTML
--
-- The 3 ported posts have per-article custom prose: inline figures, speculation
-- callouts, drop caps, varying H2 section counts, plus a deal-stats grid that
-- differs per post (sold vs for-sale, custom labels like "Implied NOI" or
-- "Listing Broker"). To render verbatim against David's prototype, we let each
-- article carry its own rendered HTML for these blocks.
--
-- body_md stays as the future-editor markdown source; body_html is what the
-- post page actually renders. When the editor lands it'll produce both —
-- author edits body_md, system snapshots body_html on save.

alter table articles
  add column body_html text,
  add column deal_stats_html text;
