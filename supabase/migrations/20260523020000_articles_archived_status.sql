-- Atlas Brief migration: 'archived' status on articles
--
-- David wants two distinct destructive actions in the article manager:
--   archive  → flip out of 'published', keep all content intact, reversible
--   trash    → soft-delete via deleted_at, recoverable from a Trash section
--
-- The public site already filters status='published', so an archived row
-- automatically disappears from /atlas-brief without touching the public
-- query layer.

alter table articles drop constraint articles_status_check;

alter table articles
  add constraint articles_status_check
  check (status in ('draft', 'ready', 'published', 'archived'));
