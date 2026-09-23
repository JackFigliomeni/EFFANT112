import Anthropic from "@anthropic-ai/sdk";
import { NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { generateAutomationRecord } from "@/lib/automationRunner";
import type { AutomationBlock, InputBlock, TableBlock, ToolSchema } from "@/lib/schema";

export const runtime = "nodejs";
export const maxDuration = 300;

/**
 * Vercel Cron hits this once a day (see vercel.json). For every Pro-plan
 * tool whose schema has an `automation` block, calls Claude to generate one
 * record and inserts it into that block's target table — the one block
 * type in this engine that actually runs on its own, unlike the passive
 * `rule` block. Free-plan automations don't run here at all — they're
 * manual-only (see the test-run route) per PLAN_LIMITS.free.automationTestRuns.
 *
 * Runs as the service role (see lib/supabase/admin.ts) since there's no
 * logged-in user here — this is the same shape as the Stripe webhook route.
 */

function isAuthorized(request: Request): boolean {
  const secret = process.env.CRON_SECRET;
  if (!secret) return false;
  return request.headers.get("authorization") === `Bearer ${secret}`;
}

export async function GET(request: Request) {
  if (!isAuthorized(request)) {
    return NextResponse.json({ error: "Unauthorized." }, { status: 401 });
  }
  if (!process.env.ANTHROPIC_API_KEY) {
    return NextResponse.json({ error: "ANTHROPIC_API_KEY is not set." }, { status: 500 });
  }

  const admin = createAdminClient();
  const { data: tools, error } = await admin.from("tools").select("id, schema, owner_id");
  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  const ownerIds = [...new Set((tools ?? []).map((t) => t.owner_id).filter((id): id is string => !!id))];
  const { data: profiles } = await admin.from("profiles").select("id, plan").in("id", ownerIds);
  const planByOwnerId = new Map((profiles ?? []).map((p) => [p.id, p.plan]));

  const client = new Anthropic();
  const results: { tool_id: string; automation_id: string; status: "ok" | "error" | "skipped"; detail?: string }[] = [];

  for (const tool of tools ?? []) {
    // Pre-auth tools (no owner) and free-plan owners don't get the daily
    // cron — only a signed-in Pro owner's automations run automatically.
    if (!tool.owner_id || planByOwnerId.get(tool.owner_id) !== "pro") continue;

    const schema = tool.schema as ToolSchema;
    const automations = schema.blocks.filter((b): b is AutomationBlock => b.type === "automation");
    if (automations.length === 0) continue;
    const tables = schema.blocks.filter((b): b is TableBlock => b.type === "table");
    const inputsById = new Map(
      schema.blocks.filter((b): b is InputBlock => b.type === "input").map((b) => [b.id, b]),
    );

    for (const automation of automations) {
      try {
        const table = tables.find((t) => t.id === automation.target);
        const { data: recent } = await admin
          .from("tool_records")
          .select("data")
          .eq("tool_id", tool.id)
          .eq("table_id", automation.target)
          .eq("user_id", tool.owner_id)
          .order("created_at", { ascending: false })
          .limit(14);
        const data = await generateAutomationRecord(
          client,
          automation,
          table,
          inputsById,
          (recent ?? []).map((r) => r.data as Record<string, unknown>),
        );
        const { error: insertError } = await admin
          .from("tool_records")
          .insert({ tool_id: tool.id, table_id: automation.target, user_id: tool.owner_id, data });
        if (insertError) throw new Error(insertError.message);
        results.push({ tool_id: tool.id, automation_id: automation.id, status: "ok" });
      } catch (err) {
        console.error("cron/automations: failed", tool.id, automation.id, err);
        results.push({
          tool_id: tool.id,
          automation_id: automation.id,
          status: "error",
          detail: err instanceof Error ? err.message : "unknown error",
        });
      }
    }
  }

  return NextResponse.json({ ran: results.length, results });
}
