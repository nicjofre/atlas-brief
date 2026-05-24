-- Atlas Brief migration: AI draft scratchpad on articles
--
-- When the article generator runs against a listing, it produces a multi-part
-- document: gaps list, tier recommendation, full Tape 1 / Tape 2 / Tape 3
-- drafts, and a suggested broker outreach email. David edits these in the
-- article editor; when he picks a tier and publishes, the chosen tape's
-- fields are copied into the article's structured columns (headline, deck,
-- body_html, takeaways, etc.) and status flips to 'published'.
--
-- ai_draft holds the full structured AI response so the editor can show
-- per-tier tabs and preserve edits without flattening to a single body
-- before David has decided which tape is the keeper.

alter table articles
  add column ai_draft jsonb;
