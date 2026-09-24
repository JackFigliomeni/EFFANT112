-- A saved tool had no way back once you overwrote it — refine it badly, or
-- fat-finger a hand edit in Builder's code box, and the previous version was
-- just gone. Snapshots the row's prior state right before every update that
-- actually changes its schema, keeping the last 10 per tool.
create table if not exists public.tool_revisions (
  id           uuid primary key default gen_random_uuid(),
  tool_id      uuid not null references public.tools(id) on delete cascade,
  name         text not null,
  schema       jsonb not null,
  theme_color  text,
  description  text,
  created_at   timestamptz not null default now()
);

create index if not exists tool_revisions_tool_id_idx on public.tool_revisions (tool_id, created_at desc);

alter table public.tool_revisions enable row level security;

drop policy if exists "tool_revisions_owner_all" on public.tool_revisions;
create policy "tool_revisions_owner_all"
  on public.tool_revisions for all
  to authenticated
  using (
    exists (
      select 1 from public.tools
      where tools.id = tool_revisions.tool_id
        and tools.owner_id = auth.uid()
    )
  )
  with check (
    exists (
      select 1 from public.tools
      where tools.id = tool_revisions.tool_id
        and tools.owner_id = auth.uid()
    )
  );

create or replace function public.snapshot_tool_revision()
returns trigger as $$
begin
  insert into public.tool_revisions (tool_id, name, schema, theme_color, description)
  values (old.id, old.name, old.schema, old.theme_color, old.description);

  delete from public.tool_revisions
  where tool_id = old.id
    and id not in (
      select id from public.tool_revisions
      where tool_id = old.id
      order by created_at desc
      limit 10
    );

  return new;
end;
$$ language plpgsql security definer set search_path = public;

drop trigger if exists tools_snapshot_before_update on public.tools;
create trigger tools_snapshot_before_update
  before update on public.tools
  for each row
  when (old.schema is distinct from new.schema)
  execute function public.snapshot_tool_revision();
