-- Atlas Brief migration: make articles.listing_id unique only for non-trashed rows
--
-- Without this, a trashed article holds the listing_id slot forever — David
-- can't draft a fresh article for the same listing until the old one is hard-
-- deleted. Partial unique index lets trashed rows accumulate without blocking
-- new drafts.

alter table articles drop constraint articles_listing_id_key;

create unique index articles_listing_id_active_uniq
  on articles (listing_id)
  where deleted_at is null;
