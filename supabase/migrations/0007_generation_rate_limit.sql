-- Durable, shared rate-limit log for /api/generate-schema (the Anthropic-
-- calling route). Replaces the in-memory Map that route used, which reset
-- on every cold start and didn't share state across serverless instances —
-- effectively no real limit at all under real traffic. This table is the
-- source of truth instead: count rows in the last hour, insert one per call.
create table if not exists public.generation_requests (
  id         uuid primary key default gen_random_uuid(),
  user_id    uuid not null references auth.users(id) on delete cascade,
  created_at timestamptz not null default now()
);

create index if not exists generation_requests_user_time_idx
  on public.generation_requests (user_id, created_at);

alter table public.generation_requests enable row level security;

-- A user can log and count only their own requests — this table has no
-- read use case beyond the rate-limit check itself.
drop policy if exists "generation_requests_own" on public.generation_requests;
create policy "generation_requests_own"
  on public.generation_requests for all
  to authenticated
  using (user_id = auth.uid())
  with check (user_id = auth.uid());

-- Old rows are just noise after the rate-limit window passes — keep the
-- table small. Not scheduled automatically (this project has no pg_cron
-- job runner set up); run manually or wire up a scheduled function later.
-- delete from public.generation_requests where created_at < now() - interval '1 day';
