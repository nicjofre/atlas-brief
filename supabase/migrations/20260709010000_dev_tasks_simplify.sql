-- Simplify the Development tracker per Nic's feedback: drop the separate
-- time-entry log and status board; each task carries its own running time box
-- (minutes) that gets incremented as work happens, plus a detail field.

alter table dev_tasks add column if not exists detail text;
alter table dev_tasks add column if not exists minutes integer not null default 0;

-- No longer used — time now accumulates per task instead of as a log.
drop table if exists dev_time_entries;
