-- Minimal admin mechanism: a table of user ids, checked via a security
-- definer function (same pattern as 0009 — avoids the cross-table-subquery
-- RLS quirk hit there). Lets an admin actually read the reports table from
-- the app (previously reports was write-only from the app's side, reviewed
-- only via the Supabase table editor).
create table if not exists public.admins (
  user_id    uuid primary key references auth.users(id) on delete cascade,
  created_at timestamptz not null default now()
);

alter table public.admins enable row level security;

-- A user can check membership for themselves only — no one can list all
-- admins through the app.
drop policy if exists "admins_select_self" on public.admins;
create policy "admins_select_self"
  on public.admins for select
  to authenticated
  using (user_id = auth.uid());

create or replace function public.is_admin()
returns boolean
language sql
security definer
set search_path = public
stable
as $$
  select exists (select 1 from public.admins where user_id = auth.uid());
$$;

grant execute on function public.is_admin() to authenticated;

drop policy if exists "reports_select_admin" on public.reports;
create policy "reports_select_admin"
  on public.reports for select
  to authenticated
  using ( public.is_admin() );

-- To make yourself an admin, run (with your real account's email):
--   insert into public.admins (user_id)
--   select id from auth.users where email = 'you@example.com';
