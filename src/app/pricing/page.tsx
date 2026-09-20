"use client";

import { useEffect, useState } from "react";
import { useSearchParams } from "next/navigation";
import { Suspense } from "react";
import { createClient } from "@/lib/supabase/client";
import { Button } from "@/components/ui/button";
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
    <section className="mx-auto max-w-4xl py-8">
      <span className="font-mono text-[10px] uppercase text-signal">Pricing</span>
      <h1 className="mt-3 text-3xl font-semibold">Start free. Upgrade when you outgrow it.</h1>

      {justUpgraded && (
        <p className="mt-6 border-l-2 border-fresh pl-3 text-xs text-muted-foreground">You&rsquo;re on Pro now. Thank you.</p>
      )}

      <div className="mt-12 grid gap-6 md:grid-cols-2">
        <div className="flex flex-col gap-4 rounded-[20px] border border-border bg-card/70 p-7 shadow-soft backdrop-blur-xl">
          <h2 className="text-lg font-semibold">Free</h2>
          <p className="text-3xl font-semibold">$0</p>
          <ul className="flex flex-col text-sm text-muted-foreground [&>li]:border-t [&>li]:border-border [&>li]:py-2.5">
            <li>
              Up to {PLAN_LIMITS.free.tools} {PLAN_LIMITS.free.tools === 1 ? "tool" : "tools"}
            </li>
            <li>{PLAN_LIMITS.free.generationsPerMonth} AI generations a month</li>
            <li>{PLAN_LIMITS.free.automationTestRuns} test runs per automation</li>
            <li>Private, workspace, and public sharing</li>
            <li>Install any tool as its own app</li>
          </ul>
          {plan === "free" && <span className="mt-auto font-mono text-[9px] uppercase text-muted-foreground">Your current plan</span>}
        </div>

        <div className="flex flex-col gap-4 rounded-[20px] border border-signal/40 bg-card/80 p-7 shadow-soft backdrop-blur-xl">
          <h2 className="text-lg font-semibold">Pro</h2>
          <p className="text-3xl font-semibold">{PRO_PRICE_DISPLAY}</p>
          <ul className="flex flex-col text-sm text-muted-foreground [&>li]:border-t [&>li]:border-border [&>li]:py-2.5">
            <li>Unlimited tools</li>
            <li>{PLAN_LIMITS.pro.generationsPerMonth} AI generations a month</li>
            <li>Up to {PLAN_LIMITS.pro.maxActiveAutomations} automations, running daily</li>
            <li>Private, workspace, and public sharing</li>
            <li>Install any tool as its own app</li>
          </ul>
          {plan === "pro" ? (
            <span className="mt-auto font-mono text-[9px] uppercase text-muted-foreground">Your current plan</span>
          ) : (
            <Button variant="signal" className="mt-auto w-fit" onClick={upgrade} disabled={loading}>
              {loading ? "Redirecting…" : "Upgrade to Pro"}
            </Button>
          )}
        </div>
      </div>

      {error && <p className="mt-6 text-xs text-destructive">{error}</p>}
    </section>
  );
}

export default function PricingPage() {
  return (
    <Suspense>
      <PricingInner />
    </Suspense>
  );
}
