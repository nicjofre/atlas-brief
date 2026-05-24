-- Atlas Brief migration: David's voice-of-the-operator reactions on articles
--
-- The first draft from Claude produces a structurally complete article with
-- [ATLAS HEADLINE], [ATLAS READ: ...], [BROKER TAG NOTE], [TRADE RANGE: ...]
-- placeholders. Manually swapping each one is tedious. Instead, the draft now
-- also surfaces 3-5 deal-specific angles for David to react to, and a single
-- free-form response captures his operator take. A second AI pass weaves the
-- reaction back into the draft.
--
-- Shape:
--   { "angles":       [ "What's your honest trade range?", "Soft-story?", ... ],
--     "response":     "Free-form text — David's take, may not address every angle",
--     "recorded_at":  "2026-05-23T22:00:00Z" }

alter table articles
  add column david_reactions jsonb;
