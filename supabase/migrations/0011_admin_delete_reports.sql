-- The admin reports page could view but not act on anything — an admin
-- should be able to dismiss/delete a report once handled.
drop policy if exists "reports_delete_admin" on public.reports;
create policy "reports_delete_admin"
  on public.reports for delete
  to authenticated
  using ( public.is_admin() );
