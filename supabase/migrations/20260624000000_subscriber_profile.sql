-- Atlas Brief migration: minimal subscriber profile fields
--
-- Captured via an optional pop-up at signup (the modal completes the signup in
-- a single insert, so anon stays insert-only — no UPDATE policy needed). Both
-- nullable: a subscriber who skips the pop-up still has just an email.
--   first_name — lets David personalize the dispatch
--   role       — Broker / Investor / Owner-Operator / Lender / Other; David
--                segments on this. Stored here (the source of truth); Resend
--                only carries the email + first name.
alter table subscribers add column first_name text;
alter table subscribers add column role text;
