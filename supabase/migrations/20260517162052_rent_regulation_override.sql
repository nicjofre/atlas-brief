-- Atlas Brief migration 0010: manual rent regulation override
--
-- The derived rent regulation (RSO / AB 1482 Only / Exempt) from
-- year_built is right ~90% of the time but misses edge cases like
-- post-1978 buildings still under RSO (LA ordinance designations,
-- REAP, opt-ins). This column lets David override the derivation
-- on a per-listing basis when he knows better. When null, the
-- derived value applies.

alter table listings
  add column rent_regulation_override text
    check (
      rent_regulation_override in ('RSO', 'AB 1482 Only', 'Exempt')
      or rent_regulation_override is null
    );
