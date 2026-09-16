-- Phase 0: the one table everything in the product is built from.
create extension if not exists "pgcrypto";

-- owner_id / workspace_id are nullable here on purpose: the roadmap builds
-- Phase 1 (the engine) and Phase 2/3 (builder, prompt-to-schema) before
-- Phase 4 (auth). A tool created pre-auth just has no owner/workspace yet.
-- Phase 4's migration (0002) adds the `profiles`/`workspaces` tables; app
-- code should start setting owner_id/workspace_id on every insert from that
-- point on. Tighten these to NOT NULL later if you want to retroactively
-- require it.
create table if not exists public.tools (
  id           uuid primary key default gen_random_uuid(),
  owner_id     uuid references auth.users(id) on delete cascade,
  workspace_id uuid,
  name         text not null,
  schema       jsonb not null,
  visibility   text not null default 'private' check (visibility in ('private', 'workspace')),
  created_at   timestamptz not null default now()
);

create index if not exists tools_owner_id_idx on public.tools (owner_id);
create index if not exists tools_workspace_id_idx on public.tools (workspace_id);

-- RLS is enabled here but permissive until Phase 5 defines real policies,
-- so Phase 0-3 development (with the anon key, no auth yet) keeps working.
alter table public.tools enable row level security;

drop policy if exists "tools_dev_allow_all" on public.tools;
create policy "tools_dev_allow_all"
  on public.tools
  for all
  using (true)
  with check (true);
