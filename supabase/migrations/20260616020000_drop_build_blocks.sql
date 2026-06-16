-- Drop the Build-page block tables (Build page was removed).
-- The Build doc was deleted via the API first, so these are empty. They live
-- in Payload's `payload` schema. Dropping them keeps the schema in sync with
-- the Payload config (which no longer defines these blocks).

drop table if exists payload.pages_blocks_build_hero_meta cascade;
drop table if exists payload.pages_blocks_build_hero cascade;
drop table if exists payload.pages_blocks_capabilities cascade;
drop table if exists payload.pages_blocks_steps_items cascade;
drop table if exists payload.pages_blocks_steps cascade;
drop table if exists payload.pages_blocks_cta cascade;
