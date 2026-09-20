import Anthropic from "@anthropic-ai/sdk";
import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { generateAutomationRecord } from "@/lib/automationRunner";
import { PLAN_LIMITS, isPlan } from "@/lib/plans";
import type { AutomationBlock, InputBlock, TableBlock, ToolSchema } from "@/lib/schema";

export const runtime = "nodejs";

/**
 * Free plan's substitute for the daily cron (src/app/api/cron/automations):
 * a manual, on-demand run of one automation block, capped at
 * PLAN_LIMITS.free.automationTestRuns total per block. Pro owners can also
 * hit this for an immediate preview instead of waiting for the next cron
 * run — it's not capped for them, only for free.
 *
 * Runs as the signed-in owner via the normal RLS-scoped client (not the
 * admin client) — this is a user-initiated action with a real session,
 * unlike the cron route.
 */
export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string; automationId: string }> },
) {
  const { id, automationId } = await params;
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: "Sign in first." }, { status: 401 });
  }
  if (!process.env.ANTHROPIC_API_KEY) {
    return NextResponse.json({ error: "ANTHROPIC_API_KEY is not set on the server." }, { status: 500 });
  }

  const { data: tool, error: toolError } = await supabase
    .from("tools")
    .select("id, schema, owner_id")
    .eq("id", id)
    .maybeSingle();
  if (toolError || !tool) {
    return NextResponse.json({ error: "Couldn't load this tool." }, { status: 404 });
  }
  if (tool.owner_id !== user.id) {
    return NextResponse.json({ error: "You don't own this tool." }, { status: 403 });
  }

  const schema = tool.schema as ToolSchema;
  const automation = schema.blocks.find(
    (b): b is AutomationBlock => b.type === "automation" && b.id === automationId,
  );
  if (!automation) {
    return NextResponse.json({ error: "That automation block doesn't exist." }, { status: 404 });
  }

  const { data: profile } = await supabase.from("profiles").select("plan").eq("id", user.id).maybeSingle();
  const plan = isPlan(profile?.plan) ? profile.plan : "free";
  if (plan === "free" && automation.testRunsUsed >= PLAN_LIMITS.free.automationTestRuns) {
    return NextResponse.json(
      {
        error: `You've used all ${PLAN_LIMITS.free.automationTestRuns} free test runs for this automation — upgrade to Pro for it to run automatically every day.`,
      },
      { status: 403 },
    );
  }

  const table = schema.blocks.find((b): b is TableBlock => b.type === "table" && b.id === automation.target);
  const inputsById = new Map(
    schema.blocks.filter((b): b is InputBlock => b.type === "input").map((b) => [b.id, b]),
  );
  const { data: recent } = await supabase
    .from("tool_records")
    .select("data")
    .eq("tool_id", tool.id)
    .eq("table_id", automation.target)
    .order("created_at", { ascending: false })
    .limit(14);

  let data: Record<string, unknown>;
  try {
    const client = new Anthropic();
    data = await generateAutomationRecord(
      client,
      automation,
      table,
      inputsById,
      (recent ?? []).map((r) => r.data as Record<string, unknown>),
    );
  } catch (err) {
    if (err instanceof Anthropic.APIError) {
      return NextResponse.json({ error: `Anthropic API error: ${err.message}` }, { status: 502 });
    }
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Test run failed." },
      { status: 502 },
    );
  }

  const { error: insertError } = await supabase
    .from("tool_records")
    .insert({ tool_id: tool.id, table_id: automation.target, data });
  if (insertError) {
    return NextResponse.json({ error: `Couldn't save the result: ${insertError.message}` }, { status: 500 });
  }

  if (plan === "free") {
    const updatedBlocks = schema.blocks.map((b) =>
      b.type === "automation" && b.id === automationId ? { ...b, testRunsUsed: b.testRunsUsed + 1 } : b,
    );
    await supabase.from("tools").update({ schema: { blocks: updatedBlocks } }).eq("id", tool.id);
  }

  return NextResponse.json({ record: data });
}
