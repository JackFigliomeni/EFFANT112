-- Phase 5: real visibility rules, enforced at the database level.
-- Replaces the permissive dev policy from 0001 now that auth/workspaces exist.
drop policy if exists "tools_dev_allow_all" on public.tools;

-- Owner can always see, edit, and delete their own tools regardless of visibility.
drop policy if exists "tools_owner_all" on public.tools;
create policy "tools_owner_all"
  on public.tools for all
  to authenticated
  using (owner_id = auth.uid())
  with check (owner_id = auth.uid());

-- Anyone in the same workspace can read a tool marked "workspace" visible,
-- even if they don't own it.
drop policy if exists "tools_workspace_select" on public.tools;
create policy "tools_workspace_select"
  on public.tools for select
  to authenticated
  using (
    visibility = 'workspace'
    and workspace_id = (
      select workspace_id from public.profiles where id = auth.uid()
    )
  );
