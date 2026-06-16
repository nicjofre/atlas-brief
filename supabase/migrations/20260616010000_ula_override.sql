-- Atlas Brief migration: manual ULA override
--
-- The derived ULA fields (ula_threshold_status, ula_tax_estimate) are computed
-- from sale price alone — they do NOT know jurisdiction. Measure ULA only
-- applies within the City of Los Angeles, so for properties in other cities
-- (Santa Monica, Beverly Hills, unincorporated county, etc.) the derived
-- estimate is wrong. This free-text column lets David override/annotate ULA
-- per listing (e.g. "N/A — outside City of LA", or a manual figure + note).
-- When null, the derived ULA values apply.

alter table listings
  add column ula_override text;
