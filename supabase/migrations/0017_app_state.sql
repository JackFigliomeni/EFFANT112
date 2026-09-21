-- Where a generated app keeps each person's data (see components/AppFrame).
-- One row per (app, person): private to that person, and it follows them
-- across devices — which is what makes an installed app feel like theirs.
-- Deliberately NOT tool_records: those are readable by anyone when a tool is
-- public, and an app's saved state (a journal, a budget) must never be.
create table if not exists public.app_state (
  tool_id    uuid not null references public.tools(id) on delete cascade,
  user_id    uuid not null references auth.users(id) on delete cascade,
  data       jsonb not null default '{}'::jsonb,
  updated_at timestamptz not null default now(),
  primary key (tool_id, user_id),
  constraint app_state_size_check check (pg_column_size(data) < 60000)
);

alter table public.app_state enable row level security;

drop policy if exists "app_state_own" on public.app_state;
create policy "app_state_own"
  on public.app_state for all
  to authenticated
  using (user_id = auth.uid())
  with check (user_id = auth.uid());
