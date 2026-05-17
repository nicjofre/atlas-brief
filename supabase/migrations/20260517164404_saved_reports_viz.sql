-- Atlas Brief migration 0012: viz config on saved_reports
--
-- Stores the chart/axis hint alongside the SQL so re-running a saved
-- report shows it with the same chart it was saved with.

alter table saved_reports
  add column viz jsonb;
