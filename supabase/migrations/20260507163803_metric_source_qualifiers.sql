-- Atlas Brief migration 0005: source qualifiers for CAP / GRM metrics
--
-- David needs to distinguish between:
--   * 'stated'    — broker's pitch number (in OM, in CoStar's listing snapshot)
--   * 'at_close'  — verified actual after sale (CoStar sold comp research)
--   * 'proforma'  — broker's market projection (OM market column)

alter table listings
  add column cap_rate_current_source text
    check (cap_rate_current_source in ('stated','at_close','proforma') or cap_rate_current_source is null),
  add column cap_rate_market_source text
    check (cap_rate_market_source in ('stated','at_close','proforma') or cap_rate_market_source is null),
  add column grm_current_source text
    check (grm_current_source in ('stated','at_close','proforma') or grm_current_source is null),
  add column grm_market_source text
    check (grm_market_source in ('stated','at_close','proforma') or grm_market_source is null);
