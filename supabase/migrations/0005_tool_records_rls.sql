-- Phase 5: tighten tool_records the same way 0003 tightened tools.
drop policy if exists "tool_records_dev_allow_all" on public.tool_records;

-- Owner of the parent tool can do anything with its records.
drop policy if exists "tool_records_owner_all" on public.tool_records;
create policy "tool_records_owner_all"
  on public.tool_records for all
  to authenticated
  using (
    exists (
      select 1 from public.tools
      where tools.id = tool_records.tool_id
        and tools.owner_id = auth.uid()
    )
  )
  with check (
    exists (
      select 1 from public.tools
      where tools.id = tool_records.tool_id
        and tools.owner_id = auth.uid()
    )
  );

-- Workspace members can read records belonging to a workspace-visible tool.
drop policy if exists "tool_records_workspace_select" on public.tool_records;
create policy "tool_records_workspace_select"
  on public.tool_records for select
  to authenticated
  using (
    exists (
      select 1 from public.tools
      where tools.id = tool_records.tool_id
        and tools.visibility = 'workspace'
        and tools.workspace_id = (
          select workspace_id from public.profiles where id = auth.uid()
        )
    )
  );
