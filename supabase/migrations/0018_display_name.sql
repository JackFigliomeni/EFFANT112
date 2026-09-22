-- Profiles gain a display name — shown as "by ..." on the Community page and
-- used to name a new workspace instead of the owner's email address. Also
-- adds the update policies neither profiles nor workspaces had before (both
-- only supported select/insert), since setting your name is itself an update.
alter table public.profiles
  add column if not exists display_name text;

drop policy if exists "profiles_update_own" on public.profiles;
create policy "profiles_update_own"
  on public.profiles for update
  to authenticated
  using (id = auth.uid())
  with check (id = auth.uid());

-- Lets a workspace be renamed by any of its members — mirrors the existing
-- "any authenticated member can select" model workspaces already use.
drop policy if exists "workspaces_update_member" on public.workspaces;
create policy "workspaces_update_member"
  on public.workspaces for update
  to authenticated
  using (exists (
    select 1 from public.profiles
    where profiles.workspace_id = workspaces.id and profiles.id = auth.uid()
  ))
  with check (exists (
    select 1 from public.profiles
    where profiles.workspace_id = workspaces.id and profiles.id = auth.uid()
  ));
