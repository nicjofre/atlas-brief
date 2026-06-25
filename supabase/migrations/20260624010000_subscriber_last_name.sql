-- Atlas Brief migration: split subscriber name into first + last
--
-- The signup pop-up now asks for first AND last name (both required in the UI),
-- so David gets a named contact list, not anonymous emails. Still nullable at
-- the DB level — the column is enforced by the form, and a row could exist from
-- a back-sync or import without a name.
alter table subscribers add column last_name text;
