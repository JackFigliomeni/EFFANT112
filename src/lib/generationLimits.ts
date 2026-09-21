import { PLAN_LIMITS, isPlan } from "@/lib/plans";
import type { SupabaseClient } from "@supabase/supabase-js";

// Two independent checks, both Postgres-backed (durable, shared across
// every serverless instance) via the `generation_requests` log table
// (migration 0007) — an in-memory Map resets on cold start and doesn't
// share state across instances, so under real traffic it wasn't really
// limiting anything.
//
// 1. A short-window abuse guard, same for every plan: stops a runaway
//    script/burst regardless of what someone's actually paying for.
// 2. The real business limit: a monthly quota that depends on plan
//    (see src/lib/plans.ts) — this is what Free vs Pro actually means.
const ABUSE_GUARD_LIMIT = 10;
const ABUSE_GUARD_WINDOW_MS = 60 * 60 * 1000;
const PLAN_WINDOW_MS = 30 * 24 * 60 * 60 * 1000;

export async function checkRateLimit(
  supabase: SupabaseClient,
  userId: string,
): Promise<{ limited: false } | { limited: true; reason: string }> {
  const hourAgo = new Date(Date.now() - ABUSE_GUARD_WINDOW_MS).toISOString();
  const { count: hourCount, error: hourError } = await supabase
    .from("generation_requests")
    .select("id", { count: "exact", head: true })
    .eq("user_id", userId)
    .gte("created_at", hourAgo);

  // Fail open on a count-check error (e.g. a transient DB hiccup) rather
  // than blocking every generation because the rate limiter itself broke.
  if (hourError) {
    console.error("generation limits: rate limit check failed", hourError.message);
    return { limited: false };
  }
  if ((hourCount ?? 0) >= ABUSE_GUARD_LIMIT) {
    return { limited: true, reason: "Rate limit reached — try again in a bit." };
  }

  const { data: profile } = await supabase
    .from("profiles")
    .select("plan")
    .eq("id", userId)
    .maybeSingle();
  const plan = isPlan(profile?.plan) ? profile.plan : "free";
  const monthlyLimit = PLAN_LIMITS[plan].generationsPerMonth;

  const monthAgo = new Date(Date.now() - PLAN_WINDOW_MS).toISOString();
  const { count: monthCount, error: monthError } = await supabase
    .from("generation_requests")
    .select("id", { count: "exact", head: true })
    .eq("user_id", userId)
    .gte("created_at", monthAgo);

  if (monthError) {
    console.error("generation limits: monthly quota check failed", monthError.message);
    return { limited: false };
  }
  if ((monthCount ?? 0) >= monthlyLimit) {
    return {
      limited: true,
      reason:
        plan === "free"
          ? `You've used your ${monthlyLimit} free generations this month — upgrade to Pro for more.`
          : `You've hit your Pro plan's ${monthlyLimit}/month limit — it resets next month.`,
    };
  }

  return { limited: false };
}

