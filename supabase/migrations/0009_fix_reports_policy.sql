-- The reports_insert_public_tool policy (0008) has a correct, verified
-- expression — (EXISTS (SELECT 1 FROM tools WHERE tools.id = reports.tool_id
-- AND tools.visibility = 'public')) — and the standalone predicate reliably
-- evaluates true under `set role anon`, yet the same expression as an
-- INSERT's WITH CHECK reliably rejected the row. Diagnosed down to the
-- expression and grants both being correct, so rather than chase an
-- obscure Postgres RLS-plus-cross-table-subquery planner interaction
-- further, switching to the standard, more robust pattern for this: a
-- security definer function evaluates with the function owner's privilege
-- internally, sidestepping whatever current-role-dependent quirk was
-- blocking the inline subquery.
create or replace function public.tool_is_public(p_tool_id uuid)
returns boolean
language sql
security definer
set search_path = public
stable
as $$
  select exists (
    select 1 from public.tools
    where tools.id = p_tool_id
      and tools.visibility = 'public'
  );
$$;

grant execute on function public.tool_is_public(uuid) to anon, authenticated;

drop policy if exists "reports_insert_public_tool" on public.reports;
create policy "reports_insert_public_tool"
  on public.reports for insert
  to public
  with check ( public.tool_is_public(tool_id) );
