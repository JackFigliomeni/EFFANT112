// Single source of truth for what Free vs Pro actually means — referenced
// by the generate-schema rate limiter, the pricing page, and anywhere else
// that needs to display or reason about plan limits. The tool-count limit
// is also enforced independently in Postgres (migration 0012's
// enforce_tool_limit trigger) since that check needs to run at insert time
// regardless of which client creates the tool.
export const PLAN_LIMITS = {
  free: { tools: 3, generationsPerMonth: 5 },
  pro: { tools: Infinity, generationsPerMonth: 100 },
} as const;

export type Plan = keyof typeof PLAN_LIMITS;

export const PRO_PRICE_DISPLAY = "$9/month";

export function isPlan(value: unknown): value is Plan {
  return value === "free" || value === "pro";
}
