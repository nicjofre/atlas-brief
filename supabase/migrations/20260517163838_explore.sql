-- Atlas Brief migration 0011: Explore (AI Q&A) infrastructure
--
-- explore_query: a locked-down SQL executor for the Explore UI.
-- Accepts a SELECT (or CTE-prefixed WITH) statement, rejects anything
-- that could mutate data, wraps the query to enforce LIMIT 500, and
-- returns rows as JSONB. Runs with statement_timeout 30s to prevent
-- runaway queries.
--
-- saved_reports: user-named saved natural-language questions for re-running.

create or replace function explore_query(query_text text)
returns jsonb
language plpgsql
as $$
declare
  result jsonb;
  trimmed text;
begin
  trimmed := upper(ltrim(query_text));
  if not (trimmed like 'SELECT%' or trimmed like 'WITH%') then
    raise exception 'Only SELECT/WITH queries are allowed';
  end if;
  if query_text ~* '\y(insert|update|delete|drop|alter|truncate|grant|revoke|create|comment|copy|merge|call|do|vacuum|analyze|reindex|cluster|listen|notify|prepare|deallocate)\y' then
    raise exception 'Forbidden statement keyword detected';
  end if;
  execute format(
    'select coalesce(jsonb_agg(row_to_json(t)), ''[]''::jsonb) from (select * from (%s) inner_q limit 500) t',
    query_text
  ) into result;
  return result;
end;
$$;

alter function explore_query(text) set statement_timeout = '30s';

grant execute on function explore_query(text) to authenticated;

-- ============================================================
-- saved_reports
-- ============================================================

create table saved_reports (
  id uuid primary key default gen_random_uuid(),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  created_by uuid references auth.users(id),
  name text not null,
  question text not null,
  sql text not null
);

create index saved_reports_created_at_idx on saved_reports (created_at desc);
create index saved_reports_created_by_idx on saved_reports (created_by);

alter table saved_reports enable row level security;

create policy saved_reports_authed_select on saved_reports for select to authenticated using (true);
create policy saved_reports_authed_insert on saved_reports for insert to authenticated with check (true);
create policy saved_reports_authed_update on saved_reports for update to authenticated using (true) with check (true);
create policy saved_reports_authed_delete on saved_reports for delete to authenticated using (true);

grant select, insert, update, delete on saved_reports to authenticated;
