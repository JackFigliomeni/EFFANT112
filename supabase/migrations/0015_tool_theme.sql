-- Lets a tool's owner pick an accent color from the Builder's new Design
-- tab — used for that tool's primary buttons/highlights (ToolRenderer),
-- its generated home-screen icon (api/tool-icon), and its PWA manifest
-- theme_color, so an installed tool actually looks like its own app
-- instead of every tool sharing one fixed black/white accent.
alter table public.tools
  add column if not exists theme_color text not null default '#171717';
