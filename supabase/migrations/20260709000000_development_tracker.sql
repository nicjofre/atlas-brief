-- Atlas Brief migration: development time tracker
--
-- Powers the internal "Development" tab — Nic's task board + billable-hours log
-- so David can track dev work. Two tables:
--   dev_tasks         — the backlog/board (backlog | in_progress | done)
--   dev_time_entries  — a dated log of hours worked (the billable record)
--
-- Internal admin only: no anon access. Authenticated users (Nic + David, who
-- both log into the dashboard) can read and write.

create table dev_tasks (
  id uuid primary key default gen_random_uuid(),
  title text not null,
  notes text,
  status text not null default 'backlog'
    check (status in ('backlog', 'in_progress', 'done')),
  estimate_hours numeric,
  sort_order int not null default 0,
  -- Billing: mark a task (and its logged hours) paid after David settles up.
  -- Bulk-set from the UI by selecting multiple tasks.
  paid boolean not null default false,
  paid_at timestamptz,
  created_at timestamptz not null default now(),
  started_at timestamptz,
  completed_at timestamptz
);

create table dev_time_entries (
  id uuid primary key default gen_random_uuid(),
  -- Nullable so time can be logged without a specific task; task deletion keeps
  -- the entry (billing history) but detaches it.
  task_id uuid references dev_tasks(id) on delete set null,
  hours numeric not null check (hours > 0),
  note text,
  worked_on date not null default current_date,
  created_at timestamptz not null default now()
);

create index dev_time_entries_task_idx on dev_time_entries(task_id);
create index dev_time_entries_worked_on_idx on dev_time_entries(worked_on);

alter table dev_tasks enable row level security;
alter table dev_time_entries enable row level security;

-- Authenticated (dashboard) users manage everything; no anon access.
create policy dev_tasks_authed_all on dev_tasks
  for all to authenticated using (true) with check (true);
create policy dev_time_entries_authed_all on dev_time_entries
  for all to authenticated using (true) with check (true);

grant select, insert, update, delete on dev_tasks to authenticated;
grant select, insert, update, delete on dev_time_entries to authenticated;
