-- Generic data storage for every tool's "table" blocks. One physical table
-- backs every logical table any tool schema declares, keyed by (tool_id, table_id).
create table if not exists public.tool_records (
  id         uuid primary key default gen_random_uuid(),
  tool_id    uuid not null references public.tools(id) on delete cascade,
  table_id   text not null, -- the `table` block's `id` in the tool's schema, e.g. "log"
  data       jsonb not null,
  created_at timestamptz not null default now()
);

create index if not exists tool_records_tool_table_idx on public.tool_records (tool_id, table_id);

alter table public.tool_records enable row level security;

-- Permissive dev policy, same rationale as 0001 — tightened in 0005 once
-- auth/workspaces exist.
drop policy if exists "tool_records_dev_allow_all" on public.tool_records;
create policy "tool_records_dev_allow_all"
  on public.tool_records
  for all
  using (true)
  with check (true);
