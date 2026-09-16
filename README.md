# Small Software Workspace

A workspace where anyone can build a small tool — by prompt or by hand — out
of a fixed set of safe building blocks, keep it private or publish it to
their workspace, and use it from a link that works on any device.

Built against the phased roadmap in `roadmap.md`-shaped instructions: Next.js
16 (App Router) + Tailwind v4 + Supabase (Postgres + magic-link auth + RLS) +
the Anthropic API.

## Status

| Phase | What | Status |
|---|---|---|
| 0 | Project setup | ✅ Scaffolded. Needs your Supabase project + migrations run (see below). |
| 1 | Engine (`ToolRenderer`) | ✅ Built. Try it at `/tools/demo` once Supabase is connected. |
| 2 | Manual builder | ✅ Built at `/builder`. |
| 3 | Prompt → schema | ✅ Built at `/generate` + `/api/generate-schema`. Needs `ANTHROPIC_API_KEY`. |
| 4 | Auth & workspaces | ✅ Built (`/login`, `/auth/callback`). Needs Supabase email auth enabled + redirect URL allow-listed. |
| 5 | Private/workspace sharing | ✅ RLS policies + `/gallery`. |
| 6 | Mobile check | ⚠️ Built with responsive Tailwind classes throughout; you should still open each screen on a phone-width window and confirm nothing scrolls sideways. |
| 7 | Pilot | Not started — this is a people step, not a build step. |

## What's left that needs you

These all need credentials or an interactive login I don't have — everything
else is done.

1. **Create a Supabase project** at [supabase.com](https://supabase.com), then
   copy `.env.example` to `.env.local` and fill in:
   - `NEXT_PUBLIC_SUPABASE_URL` / `NEXT_PUBLIC_SUPABASE_ANON_KEY` — Project
     Settings → API.
2. **Run the migrations** in `supabase/migrations/` in order (0001 → 0005),
   either by pasting each into the Supabase SQL Editor, or with the Supabase
   CLI: `supabase link` then `supabase db push`.
3. **Enable email auth** in Supabase Auth settings (it's on by default) and
   add `http://localhost:3000/auth/callback` (and your deployed URL's
   `/auth/callback`) to **Auth → URL Configuration → Redirect URLs**.
4. **Get an Anthropic API key** from [console.anthropic.com](https://console.anthropic.com)
   and set `ANTHROPIC_API_KEY` in `.env.local` (and later, in Vercel's
   environment variables — this one must NOT have the `NEXT_PUBLIC_` prefix,
   it's server-only).
5. **Deploy to Vercel**: `vercel login`, then `vercel` (or connect the GitHub
   repo in the Vercel dashboard) and add the three env vars above in the
   project's Vercel settings.

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
