-- tool_records had no notion of "whose record is this" — only (tool_id,
-- table_id). That was fine while every table-block tool was private, but
-- 0006 made a public tool's records world-readable, which is correct for a
-- genuinely shared dataset but wrong for a personal tracker (a workout log,
-- a budget) that someone publishes so *other people can use their own copy*.
-- Bring these in line with app_state (0017): each person's rows are private
-- to them, on any tool, at any visibility.
alter table public.tool_records add column if not exists user_id uuid references auth.users(id) on delete cascade;

-- Every existing row was written before anyone but the owner could insert,
-- so the owner is the correct author for all of it.
update public.tool_records tr
set user_id = t.owner_id
from public.tools t
where tr.tool_id = t.id and tr.user_id is null;

create index if not exists tool_records_user_idx on public.tool_records (tool_id, table_id, user_id);

-- Replace "the tool's owner can read/write every record" and "anyone can
-- read a public tool's records" with one rule: you can only touch your own
-- rows. Workspace-shared visibility is untouched — that's a real shared
-- dataset, not a personal one, and isn't what leaked here.
drop policy if exists "tool_records_owner_all" on public.tool_records;
drop policy if exists "tool_records_public_select" on public.tool_records;

create policy "tool_records_own_all"
  on public.tool_records for all
  to authenticated
  using (user_id = auth.uid())
  with check (user_id = auth.uid());
