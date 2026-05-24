-- Atlas Brief migration: categorize prompts into content vs system
--
-- The prompts table holds both voice/policy content (David edits freely) and
-- structural prompts that are tightly coupled to the editor's regex / the
-- AI's expected JSON shape. Editing the structural ones can break the editor,
-- so the admin UI hides them by default behind an "advanced" toggle.
--
--   content: voice, hard_rules, rules_sold, rules_for_sale,
--            controversy_moves, broker_outreach_email
--   system:  master_system, placeholders, tape_1_template,
--            tape_2_template, tape_3_template

alter table prompts
  add column category text not null default 'content'
    check (category in ('content', 'system'));

update prompts set category = 'system' where key in (
  'master_system',
  'placeholders',
  'tape_1_template',
  'tape_2_template',
  'tape_3_template'
);
