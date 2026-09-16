-- Phase 4: auth & workspaces. One workspace per invite link, to start simple.
create table if not exists public.workspaces (
  id          uuid primary key default gen_random_uuid(),
  name        text not null,
  invite_code text not null unique default substr(md5(random()::text), 1, 10),
  created_at  timestamptz not null default now()
);

-- One row per user: which workspace they belong to.
create table if not exists public.profiles (
  id           uuid primary key references auth.users(id) on delete cascade,
  workspace_id uuid not null references public.workspaces(id) on delete cascade,
  created_at   timestamptz not null default now()
);

alter table public.workspaces enable row level security;
alter table public.profiles enable row level security;

-- Any authenticated user can read a workspace's public name/invite_code
-- (needed to show "join workspace X" before they've joined it) and their own profile.
drop policy if exists "workspaces_select_authenticated" on public.workspaces;
create policy "workspaces_select_authenticated"
  on public.workspaces for select
  to authenticated
  using (true);

drop policy if exists "workspaces_insert_authenticated" on public.workspaces;
create policy "workspaces_insert_authenticated"
  on public.workspaces for insert
  to authenticated
  with check (true);

drop policy if exists "profiles_select_own" on public.profiles;
create policy "profiles_select_own"
  on public.profiles for select
  to authenticated
  using (id = auth.uid());

drop policy if exists "profiles_insert_own" on public.profiles;
create policy "profiles_insert_own"
  on public.profiles for insert
  to authenticated
  with check (id = auth.uid());
