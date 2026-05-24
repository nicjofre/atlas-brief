-- Atlas Brief migration: byline as raw HTML
--
-- Each post's byline row has 4 entries but the labels vary by post:
--   5712 Camellia: David / Published / Status / Dateline
--   1825 Gramercy: David / Published / Read time / Dateline
--   1101 W 45th:   David / Published / Status / Dateline
-- Rather than encode every possible byline label combination as schema, we
-- just store the rendered HTML for the .byl block per article.

alter table articles add column byline_html text;
