-- Backlog vs. done: a task is "done" when the work is finished (independent of
-- paid). Done tasks drop to the bottom of the Development list.
alter table dev_tasks add column if not exists done boolean not null default false;
