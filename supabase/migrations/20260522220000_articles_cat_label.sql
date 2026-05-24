-- Atlas Brief migration: per-article category label
--
-- The .cat row on a post displays "{label} · Entry № NN". For most posts
-- the label matches the section name ("Broker Activity") but David
-- sometimes overrides it (e.g. the 1825 Gramercy post shows "Comps").
-- A nullable cat_label lets the article override the default section label
-- without changing which section it routes through.

alter table articles add column cat_label text;
