# Small Software Workspace

A workspace where anyone can build a small tool — by prompt or by hand — out
of a fixed set of safe building blocks, keep it private or publish it to
their workspace, and use it from a link that works on any device.

Built against the phased roadmap in `roadmap.md`-shaped instructions: Next.js
16 (App Router) + Tailwind v4 + Supabase (Postgres + magic-link auth + RLS) +
the Anthropic API.

## Status

Live Supabase project connected and verified end-to-end (not just written —
actually tested against real infrastructure).

| Phase | What | Status |
|---|---|---|
| 0 | Project setup | ✅ Live Supabase project connected, migrations 0001/0002/0004 run. |
| 1 | Engine (`ToolRenderer`) | ✅ Verified at `/tools/demo` — input → Supabase → view round-trip confirmed against real data. |
| 2 | Manual builder | ✅ Built at `/builder`, block add/edit verified in-browser. |
| 3 | Prompt → schema | ✅ Verified — one real Anthropic call generated a valid 12-block schema from a plain-language prompt. |
| 4 | Auth & workspaces | ✅ Verified — magic-link sign-in tested for real, workspace auto-created with invite code. |
| 5 | Private/workspace sharing | ✅ Verified — RLS lockdown migrations (0003/0005) applied; confirmed anonymous reads return `[]` and anonymous inserts get a 401 RLS rejection. |
| 6 | Mobile check | ✅ Spot-checked at 375px width in-browser — no horizontal scroll, dark mode renders correctly. |
| 7 | Pilot | Not started — this is a people step, not a build step. |

## What's left that needs you

1. **Deploy to Vercel**: `vercel login`, then `vercel` (or connect the GitHub
   repo in the Vercel dashboard) and add these env vars in the project's
   Vercel settings (same names/values as your `.env.local`):
   - `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY`
   - `ANTHROPIC_API_KEY` (server-only — do NOT prefix with `NEXT_PUBLIC_`)
2. **Update Supabase's redirect URLs** once deployed: add
   `https://<your-domain>/auth/callback` alongside the localhost one in
   **Auth → URL Configuration → Redirect URLs**, and update **Site URL** to
   your real domain.
3. **Point your existing domain** at the Vercel deployment (Vercel project
   settings → Domains).

## Local development

```bash
npm install
cp .env.example .env.local   # then fill in the values above
npm run dev
```

## The core data shape

Everything is one Postgres table, `tools` (see `supabase/migrations/0001_create_tools.sql`):

```
tools
  id            uuid
  owner_id      uuid        (nullable until Phase 4 tags it)
  workspace_id  uuid        (nullable until Phase 4 tags it)
  name          text
  schema        jsonb       <- the tool definition, see below
  visibility    text        ("private" | "workspace")
  created_at    timestamp
```

A `schema` is built from six block types — the single source of truth for
this shape is `src/lib/schema.ts` (a Zod schema used for validation
everywhere: the builder, the API route, and the renderer):

```json
{
  "blocks": [
    { "type": "input", "id": "did_it", "label": "Did you do it today?", "kind": "boolean" },
    { "type": "table", "id": "log", "fields": ["did_it", "date"] },
    { "type": "view", "id": "streak_view", "source": "log", "display": "calendar" },
    { "type": "action", "id": "mark_done", "does": "add_record", "target": "log" },
    { "type": "rule", "id": "remind", "when": "not marked by 8pm", "then": "notify" }
  ]
}
```

Actual tool *data* (what a table block stores) lives in a second generic
table, `tool_records` (`supabase/migrations/0004_tool_records.sql`) — one
physical table backs every logical table any tool's schema declares, keyed
by `(tool_id, table_id)`.

## Known limitations to bring back for Phase 7

- **`rule` blocks are not enforced.** The engine renders them as a passive
  note ("when X, then Y") but nothing actually runs a check or sends a
  notification — that needs a cron/push-notification backend that's out of
  scope for the six-block engine as specified.
- `action` only implements `add_record`; `update_record` / `delete_record`
  are typed in the schema but not wired up in `ToolRenderer` yet.
- The prompt-to-schema route (`/api/generate-schema`) uses `claude-opus-5`
  with plain JSON-in-the-prompt instructions rather than the Messages API's
  structured-output mode — swap to `output_config.format` if you want the
  API itself to guarantee schema-valid JSON instead of relying on
  prompt-following + the Zod validation pass.

## Project layout

```
src/lib/schema.ts              Zod schema + types for the six block types
src/lib/exampleSchemas.ts      The hard-coded habit tracker (Phase 1 proof)
src/lib/supabase/              Browser + server Supabase clients
src/proxy.ts                   Keeps the Supabase auth cookie fresh (Next.js 16 renamed middleware.ts → proxy.ts)
src/components/renderer/       Phase 1 engine (ToolRenderer + block renderers)
src/components/builder/        Phase 2 block editor
src/app/tools/demo/            Phase 1 hard-coded demo
src/app/builder/               Phase 2 manual builder
src/app/generate/              Phase 3 prompt-to-schema UI
src/app/api/generate-schema/   Phase 3 Anthropic API route
src/app/login/, /auth/callback/  Phase 4 magic-link auth + workspace join/create
src/app/gallery/, /tools/[id]/   Phase 5 workspace gallery + tool viewer
supabase/migrations/           All SQL, in run order
```
