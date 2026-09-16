-- Adds a real "public" visibility tier (previously only private/workspace
-- existed), plus DB-level abuse resistance that holds regardless of which
-- client code path writes the data (app UI, a direct API call, a script
-- someone points at the anon key).

-- 1. Allow 'public' as a visibility value.
alter table public.tools drop constraint if exists tools_visibility_check;
alter table public.tools
  add constraint tools_visibility_check check (visibility in ('private', 'workspace', 'public'));

-- 2. Anyone — including anonymous visitors, like browsing public repos on
-- GitHub — can read a tool marked public, and the records of a public tool
-- (so a shared public tool is actually usable/viewable without an account).
-- This is deliberately read-only: only the owner can still write to it
-- (see tools_owner_all / tool_records_owner_all from 0003/0005) — visiting
-- a public tool doesn't let a stranger inject data into someone else's tool.
drop policy if exists "tools_public_select" on public.tools;
create policy "tools_public_select"
  on public.tools for select
  to public
  using (visibility = 'public');

drop policy if exists "tool_records_public_select" on public.tool_records;
create policy "tool_records_public_select"
  on public.tool_records for select
  to public
  using (
    exists (
      select 1 from public.tools
      where tools.id = tool_records.tool_id
        and tools.visibility = 'public'
    )
  );

-- 3. Payload size caps — a legitimate tool schema or data record is never
-- anywhere near these sizes; this just blocks someone stuffing a giant blob
-- in to abuse storage/egress.
alter table public.tools drop constraint if exists tools_schema_size_check;
alter table public.tools
  add constraint tools_schema_size_check check (pg_column_size(schema) < 100000); -- ~100KB

alter table public.tool_records drop constraint if exists tool_records_data_size_check;
alter table public.tool_records
  add constraint tool_records_data_size_check check (pg_column_size(data) < 20000); -- ~20KB

-- 4. Basic per-user insert rate limiting, enforced in the database so it
-- holds no matter what calls it (the app, a direct Supabase client, curl
-- against the anon key). Generous limits meant to stop obvious spam/abuse
-- scripts, not to throttle normal use.
create or replace function public.enforce_insert_rate_limit()
returns trigger as $$
declare
  recent_count int;
  limit_count int;
  window_start timestamptz := now() - interval '1 hour';
begin
  if tg_table_name = 'tools' then
    limit_count := 20; -- 20 new tools/hour/user
    select count(*) into recent_count
      from public.tools
      where owner_id = auth.uid() and created_at > window_start;
  elsif tg_table_name = 'tool_records' then
    limit_count := 300; -- 300 new records/hour/user, across their tools
    select count(*) into recent_count
      from public.tool_records tr
      join public.tools t on t.id = tr.tool_id
      where t.owner_id = auth.uid() and tr.created_at > window_start;
  else
    return new;
  end if;

  if recent_count >= limit_count then
    raise exception 'Rate limit exceeded: too many inserts in the last hour, try again later';
  end if;

  return new;
end;
$$ language plpgsql;

drop trigger if exists tools_rate_limit on public.tools;
create trigger tools_rate_limit
  before insert on public.tools
  for each row execute function public.enforce_insert_rate_limit();

drop trigger if exists tool_records_rate_limit on public.tool_records;
create trigger tool_records_rate_limit
  before insert on public.tool_records
  for each row execute function public.enforce_insert_rate_limit();
