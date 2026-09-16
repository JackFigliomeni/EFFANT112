-- Minimal content-moderation mechanism: anyone (including anonymous
-- visitors) can flag a public tool. No admin UI yet — reports are meant to
-- be reviewed directly in the Supabase table editor for now. Revisit with
-- a real admin view once there's actual report volume to manage.
create table if not exists public.reports (
  id         uuid primary key default gen_random_uuid(),
  tool_id    uuid not null references public.tools(id) on delete cascade,
  reporter_id uuid references auth.users(id) on delete set null, -- null = anonymous reporter
  reason     text not null check (char_length(reason) between 1 and 1000),
  created_at timestamptz not null default now()
);

create index if not exists reports_tool_id_idx on public.reports (tool_id);

alter table public.reports enable row level security;

-- Anyone can file a report (that's the point — including logged-out
-- visitors browsing /community), but only against a tool that's actually
-- public (no point reporting something you can't see, and this stops
-- reports being used to probe for private tool ids).
drop policy if exists "reports_insert_public_tool" on public.reports;
create policy "reports_insert_public_tool"
  on public.reports for insert
  to public
  with check (
    exists (
      select 1 from public.tools
      where tools.id = reports.tool_id
        and tools.visibility = 'public'
    )
  );

-- No select/update/delete policy for anyone — reports are write-only from
-- the app's perspective. Review them via the Supabase table editor
-- (service_role bypasses RLS) rather than exposing them through the app.
