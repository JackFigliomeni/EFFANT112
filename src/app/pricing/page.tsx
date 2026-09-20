"use client";

import { useEffect, useState } from "react";
import { useSearchParams } from "next/navigation";
import { Suspense } from "react";
import { createClient } from "@/lib/supabase/client";
import { PLAN_LIMITS, PRO_PRICE_DISPLAY, isPlan, type Plan } from "@/lib/plans";

export const dynamic = "force-dynamic";

function PricingInner() {
  const supabase = createClient();
  const searchParams = useSearchParams();
  const justUpgraded = searchParams.get("upgraded") === "1";

  const [plan, setPlan] = useState<Plan | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function loadPlan() {
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user) return;
      const { data } = await supabase.from("profiles").select("plan").eq("id", user.id).maybeSingle();
      if (isPlan(data?.plan)) setPlan(data.plan);
    }
    loadPlan();
  }, [supabase]);

  async function upgrade() {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/stripe/checkout", { method: "POST" });
      const body = await res.json();
      if (!res.ok) {
        setError(body.error ?? "Couldn't start checkout.");
        setLoading(false);
        return;
      }
      window.location.href = body.url;
    } catch {
      setError("Couldn't reach the server.");
      setLoading(false);
    }
  }

  return (
    <div className="mx-auto flex max-w-3xl flex-col gap-6 p-6">
      <div>
        <h1 className="text-xl font-semibold">Pricing</h1>
        <p className="text-sm text-black/60 dark:text-white/60">
          Start free. Upgrade whenever you outgrow it.
        </p>
      </div>

      {justUpgraded && (
        <p className="rounded-md bg-emerald-500/10 px-3 py-2 text-sm text-emerald-600">
          You&rsquo;re on Pro now — thanks!
        </p>
      )}

      <div className="grid gap-4 sm:grid-cols-2">
        <div className="flex flex-col gap-3 rounded-lg border border-black/10 p-5 dark:border-white/10">
          <h2 className="text-lg font-semibold">Free</h2>
          <p className="text-2xl font-bold">$0</p>
          <ul className="flex flex-col gap-1 text-sm text-black/70 dark:text-white/70">
            <li>
              Up to {PLAN_LIMITS.free.tools} {PLAN_LIMITS.free.tools === 1 ? "tool" : "tools"}
            </li>
            <li>{PLAN_LIMITS.free.generationsPerMonth} AI generations/month</li>
            <li>{PLAN_LIMITS.free.automationTestRuns} test runs per automation</li>
            <li>Private, workspace, and public sharing</li>
          </ul>
          {plan === "free" && (
            <span className="mt-auto text-xs text-black/50 dark:text-white/50">Your current plan</span>
          )}
        </div>

        <div className="flex flex-col gap-3 rounded-lg border-2 border-black p-5 dark:border-white">
          <h2 className="text-lg font-semibold">Pro</h2>
          <p className="text-2xl font-bold">{PRO_PRICE_DISPLAY}</p>
          <ul className="flex flex-col gap-1 text-sm text-black/70 dark:text-white/70">
            <li>Unlimited tools</li>
            <li>{PLAN_LIMITS.pro.generationsPerMonth} AI generations/month</li>
            <li>Up to {PLAN_LIMITS.pro.maxActiveAutomations} automations, running daily</li>
            <li>Private, workspace, and public sharing</li>
          </ul>
          {plan === "pro" ? (
            <span className="mt-auto text-xs text-black/50 dark:text-white/50">Your current plan</span>
          ) : (
            <button
              onClick={upgrade}
              disabled={loading}
              className="mt-auto w-fit rounded-md bg-black px-4 py-2 text-sm font-medium text-white hover:bg-black/80 disabled:opacity-50 dark:bg-white dark:text-black"
            >
              {loading ? "Redirecting…" : "Upgrade to Pro"}
            </button>
          )}
        </div>
      </div>

      {error && <p className="text-sm text-red-600">{error}</p>}
    </div>
  );
}

export default function PricingPage() {
  return (
    <Suspense>
      <PricingInner />
    </Suspense>
  );
}
