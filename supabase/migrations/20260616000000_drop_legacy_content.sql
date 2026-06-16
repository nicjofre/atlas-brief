-- Drop the interim page-content tables, now replaced by Payload CMS.
--
-- content_blocks (flat copy overrides) and page_collections (structured
-- collections) backed the old /admin/pages editor and the getPageContent /
-- getPageCollection helpers. All of that code was removed when the public
-- About / Contact / Build pages moved to Payload, so these tables are unused.

drop table if exists content_blocks;
drop table if exists page_collections;
