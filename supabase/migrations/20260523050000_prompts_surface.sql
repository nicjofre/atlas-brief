-- Atlas Brief migration: tag each prompt with the output surface it influences
--
-- The previous category split ('content' vs 'system') told David whether a
-- prompt was safe to edit, but didn't help him navigate. The surface column
-- groups prompts by what they actually shape in the published article:
--
--   shared      → applies to every tape (voice, hard rules, sold/for-sale)
--   tape_1      → one-liner voice
--   tape_2      → short voice
--   tape_3      → full brief voice + controversy moves
--   broker_email → broker outreach template
--   system      → structurally coupled to code (hide by default)

alter table prompts
  add column surface text not null default 'shared'
    check (surface in ('shared', 'tape_1', 'tape_2', 'tape_3', 'broker_email', 'system'));

update prompts set surface = case key
  when 'voice'                 then 'shared'
  when 'hard_rules'            then 'shared'
  when 'rules_sold'            then 'shared'
  when 'rules_for_sale'        then 'shared'
  when 'controversy_moves'     then 'tape_3'
  when 'tape_1_template'       then 'tape_1'
  when 'tape_2_template'       then 'tape_2'
  when 'tape_3_template'       then 'tape_3'
  when 'broker_outreach_email' then 'broker_email'
  when 'master_system'         then 'system'
  when 'placeholders'          then 'system'
  else 'shared'
end;
