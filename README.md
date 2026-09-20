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

## Block variety

Beyond the original six-block minimum, the engine now supports:

- **Input kinds**: text, textarea, number, boolean, date, time, email, url,
  select, multiselect, rating (1-5 stars).
- **View displays**: calendar, list, table, count, sum, average, latest,
  chart (simple inline-SVG bar chart, last 12 points).
- **Actions**: `add_record` (a standalone button), `update_record` (a
  per-row toggle button for a boolean field — e.g. checking off a todo),
  `delete_record` (a per-row delete button). The latter two render inline
  in whichever view shows that table, not as a floating button, since they
  need a specific row to act on.

`/api/generate-schema`'s system prompt knows about all of this, so
Claude-generated schemas can use the full variety, not just the original six.

## Pricing

Free vs Pro is defined in one place, `src/lib/plans.ts`:

| | Free | Pro ($20/month) |
|---|---|---|
| Tools | 1 | Unlimited |
| AI generations | 5/month | 100/month |
| Automations | 3 manual test runs each, no daily cron | Up to 5, running daily |

Tool limits are enforced in Postgres (migration 0012's `enforce_tool_limit`
trigger, tightened to 1 free tool by migration 0013 — holds regardless of
which client creates a tool). AI generation
limits are enforced in `/api/generate-schema` two ways: a flat 10/hour abuse
guard for everyone, and the real plan-based monthly quota above. The Pro
automation cap is enforced in Postgres too (migration 0014's
`enforce_automation_limit` trigger) — a hard cap, not a monthly quota, since
an automation runs indefinitely once created rather than resetting.
Free-plan automations never run on the daily cron at all (see "Automation
blocks" below); they're manual-only, tracked via each block's
`testRunsUsed` field.

**Setup** (needs your own Stripe account — sign up at
[stripe.com](https://stripe.com)):

1. **Create a Product + Price** for Pro ($20/month, recurring) in the Stripe
   Dashboard → Product catalog. Copy the **Price ID** (`price_...`) into
   `STRIPE_PRO_PRICE_ID`.
2. **Get your secret key** — Developers → API keys → copy the **Secret key**
   (`sk_...`, use the *test mode* one while developing) into
   `STRIPE_SECRET_KEY`.
3. **Set up the webhook** — Developers → Webhooks → Add endpoint, URL
   `https://www.<your-domain>/api/stripe/webhook` (the `www` canonical host,
   not the bare apex — if your apex 301/307-redirects to `www` or vice versa,
   Stripe does not follow that redirect when delivering webhooks, so the bare
   domain silently never gets a single event), listening for
   `checkout.session.completed`, `customer.subscription.updated`, and
   `customer.subscription.deleted`. Copy the **signing secret** (`whsec_...`)
   into `STRIPE_WEBHOOK_SECRET`.
4. **Get your Supabase service_role key** — Project Settings → API →
   `service_role` secret — into `SUPABASE_SERVICE_ROLE_KEY`. This is the one
   key in this app that bypasses RLS entirely; it's used by `/api/stripe/webhook`
   and `/api/cron/automations` (see `src/lib/supabase/admin.ts`) since neither
   has a logged-in user to scope a normal request to. Never expose it
   client-side.

All env vars need setting in Vercel's project settings too, not just
`.env.local` — see `.env.example` for the full list, including `CRON_SECRET`
(below).

## Automation blocks

Unlike `rule` (a passive, unenforced note — see "Known limitations" below),
an `automation` block actually runs: given a target table and a plain-language
prompt, it calls Claude (optionally with real web search) and inserts the
result as a new record.

- **Pro**: runs automatically once a day for every automation block, via
  Vercel Cron hitting `/api/cron/automations` (schedule in `vercel.json`).
  Requires a `CRON_SECRET` env var — any random string; Vercel sends it back
  as `Authorization: Bearer <value>` automatically once it's set on the
  project. Capped at `PLAN_LIMITS.pro.maxActiveAutomations` per account
  (migration 0014).
- **Free**: doesn't run on the cron at all. Instead, the Builder shows a
  "Test run" button per automation block that calls
  `/api/tools/[id]/automations/[automationId]/test-run` on demand, capped at
  `PLAN_LIMITS.free.automationTestRuns` total per block.

Both paths share the same generation logic in `src/lib/automationRunner.ts`.

## Known limitations to bring back for Phase 7

- **`rule` blocks are not enforced.** The engine renders them as a passive
  note ("when X, then Y") but nothing actually runs a check or sends a
  notification — that needs a cron/push-notification backend that's out of
  scope for the engine as specified.
- The prompt-to-schema route (`/api/generate-schema`) uses `claude-opus-5`
  with plain JSON-in-the-prompt instructions rather than the Messages API's
  structured-output mode — swap to `output_config.format` if you want the
  API itself to guarantee schema-valid JSON instead of relying on
  prompt-following + the Zod validation pass.

## Project layout

```
src/lib/schema.ts              Zod schema + types for the six block types
src/lib/exampleSchemas.ts      The hard-coded habit tracker (Phase 1 proof)
src/lib/automationRunner.ts    Shared Claude-call logic for automation blocks
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
src/app/api/cron/automations/  Daily automation runner (Pro), see vercel.json
src/app/api/tools/[id]/automations/.../test-run/  Manual automation runner (Free)
src/app/api/tools/[id]/manifest/, /api/tool-icon/  Per-tool PWA install support
supabase/migrations/           All SQL, in run order
```
