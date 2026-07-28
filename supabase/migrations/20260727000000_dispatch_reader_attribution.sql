-- Atlas Brief migration: tie a dispatch reader to their on-site reading
--
-- Until now the two analytics streams were strangers: email_events knows WHO
-- opened and clicked (Resend gives us the address), post_views knows WHAT was
-- read but only ever saw an anonymous ip+ua hash. This joins them.
--
-- How it works end to end:
--   1. Dispatch article links carry ?rid={{{contact.email}}} — Resend swaps in
--      each recipient's own address at broadcast send time.
--   2. On landing, /api/track/view resolves that address to a subscriber and
--      stamps post_views.subscriber_id. The raw address is never stored on the
--      view row and is stripped from the URL client-side.
--   3. The reader's track_token goes into an httpOnly cookie, so the rest of
--      the visit (and later visits from that browser) attribute too, without
--      the address ever going back on the wire.
--
-- track_token exists so the cookie carries an opaque, unguessable value rather
-- than a subscriber id — a forged cookie would have to guess a uuid, and the
-- token can be rotated per subscriber without touching anything else.

alter table subscribers add column track_token uuid not null default gen_random_uuid();
create unique index subscribers_track_token_idx on subscribers (track_token);

-- Nullable by design and null for nearly every row: only readers who arrived
-- from a dispatch (or who have the cookie from a past one) are identified. Cold
-- traffic stays anonymous, which is the whole privacy posture of post_views.
-- ON DELETE SET NULL so removing a subscriber degrades their history to
-- anonymous reads rather than deleting the reads.
alter table post_views add column subscriber_id uuid references subscribers(id) on delete set null;
create index post_views_subscriber_idx on post_views (subscriber_id) where subscriber_id is not null;

-- No policy changes needed: anon already has blanket INSERT on post_views (and
-- still no SELECT), and the subscriber lookup runs server-side over the direct
-- DB connection, the same way the Resend webhook writes. Anon never gains any
-- ability to read the subscriber list.
