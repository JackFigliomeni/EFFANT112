-- A short description a tool's owner writes in the Builder's Design tab — shown
-- on the Community page next to the tool's name so people know what it is.
alter table public.tools
  add column if not exists description text not null default '';
