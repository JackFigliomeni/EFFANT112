// Single source of truth for what Free vs Pro actually means — referenced
// by the generate-schema rate limiter, the pricing page, and anywhere else
// that needs to display or reason about plan limits. The tool-count limit
// is also enforced independently in Postgres (migration 0012's
// enforce_tool_limit trigger) since that check needs to run at insert time
// regardless of which client creates the tool.
//
// Automation blocks (src/lib/schema.ts) actually call Claude on their own —
// once a day per active automation for Pro, via cron — so unlike the other
// limits above, "unlimited" was never on the table here: cost scales with
// how many automations someone has running, independent of tool count.
// Free gets `automationTestRuns` manual, on-demand test clicks per
// automation block (see /api/tools/[id]/automations/[automationId]/test-run)
// instead of the daily cron at all. Pro's `maxActiveAutomations` is enforced
// in Postgres (migration 0014's enforce_automation_limit trigger) — a cap,
// not a quota that resets, since these run indefinitely once created.
export const PLAN_LIMITS = {
  free: { tools: 1, generationsPerMonth: 5, automationTestRuns: 3 },
  pro: { tools: Infinity, generationsPerMonth: 100, maxActiveAutomations: 5 },
} as const;

export type Plan = keyof typeof PLAN_LIMITS;

export const PRO_PRICE_DISPLAY = "$20/month";

export function isPlan(value: unknown): value is Plan {
  return value === "free" || value === "pro";
}
