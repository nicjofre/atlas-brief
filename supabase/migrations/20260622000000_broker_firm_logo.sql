-- Atlas Brief migration: broker firm logo
--
-- CoStar drops carry broker *text* (name, firm, phone, email, DRE) which the
-- parser already captures, but never images. Headshots live in
-- brokers.headshot_url; this adds a parallel slot for the firm's logo (e.g. the
-- "Lyon Stahl" mark). Stored as a storage path in the property-assets bucket,
-- same as headshot_url. A firm's logo is the same for every broker there, so the
-- enrichment UI propagates an uploaded logo to all brokers sharing the firm name
-- — upload once per firm, not once per broker.
alter table brokers add column firm_logo_url text;
