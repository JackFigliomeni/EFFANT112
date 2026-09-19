import Anthropic from "@anthropic-ai/sdk";
import { NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import type { AutomationBlock, InputBlock, TableBlock, ToolSchema } from "@/lib/schema";

export const runtime = "nodejs";
export const maxDuration = 300;

/**
 * Vercel Cron hits this once a day (see vercel.json). For every tool whose
 * schema has an `automation` block, calls Claude to generate one record and
 * inserts it into that block's target table — the one block type in this
 * engine that actually runs on its own, unlike the passive `rule` block.
 *
 * Runs as the service role (see lib/supabase/admin.ts) since there's no
 * logged-in user here — this is the same shape as the Stripe webhook route.
 */

function isAuthorized(request: Request): boolean {
  const secret = process.env.CRON_SECRET;
  if (!secret) return false;
  return request.headers.get("authorization") === `Bearer ${secret}`;
}

async function generateRecord(
  client: Anthropic,
  automation: AutomationBlock,
  table: TableBlock | undefined,
  inputsById: Map<string, InputBlock>,
  recentRecords: Record<string, unknown>[],
): Promise<Record<string, unknown>> {
  const fields = table?.fields ?? [];
  // A table field usually matches an input block of the same id — when it
  // does, tell Claude that field's exact constraints (a select/multiselect's
  // fixed options in particular), otherwise it'll happily invent a value
  // outside the dropdown's actual choices.
  const fieldNotes = fields
    .map((field) => {
      const input = inputsById.get(field);
      if (!input) return field;
      if ((input.kind === "select" || input.kind === "multiselect") && input.options) {
        return `${field} (must be ${input.kind === "multiselect" ? "one or more of" : "exactly one of"}: ${input.options.join(", ")})`;
      }
      if (input.kind === "boolean") return `${field} (true/false)`;
      if (input.kind === "rating") return `${field} (1-5)`;
      if (input.kind === "number") return `${field} (a number)`;
      return field;
    })
    .join("; ");

  const system = `You are filling in exactly one new record for a table with these fields: ${fieldNotes}.
Given the instruction below, respond with ONLY a single JSON object whose keys are exactly those fields (no extra keys, no missing keys). Use null for any field a person should fill in themselves rather than you (e.g. a rating, or whether they actually did something). Never wrap the JSON in prose or code fences.`;

  const recentNote =
    recentRecords.length > 0
      ? `\n\nRecent existing records in this table (most recent first) — avoid unnecessary repeats:\n${JSON.stringify(recentRecords)}`
      : "";

  const response = await client.messages.create({
    model: "claude-opus-5",
    max_tokens: 2048,
    system,
    messages: [{ role: "user", content: automation.prompt + recentNote }],
    ...(automation.useWebSearch
      ? { tools: [{ type: "web_search_20260209", name: "web_search" } satisfies Anthropic.WebSearchTool20260209] }
      : {}),
  });

  // With web search the model may emit server_tool_use/web_search_tool_result
  // blocks before its final answer — the last text block is the synthesized
  // JSON, not necessarily the first (or only) text block.
  const textBlocks = response.content.filter((b): b is Anthropic.TextBlock => b.type === "text");
  const last = textBlocks[textBlocks.length - 1];
  if (!last) throw new Error("Claude returned no text content.");

  const cleaned = last.text.trim().replace(/^```(?:json)?\n?/, "").replace(/\n?```$/, "");
  const parsed = JSON.parse(cleaned);
  if (typeof parsed !== "object" || parsed === null || Array.isArray(parsed)) {
    throw new Error("Claude's response wasn't a JSON object.");
  }

  const record: Record<string, unknown> = {};
  for (const field of fields) {
    record[field] = field in parsed ? parsed[field] : null;
  }
  // Claude has no reliable clock — set any "date" field ourselves.
  if (fields.includes("date")) {
    record.date = new Date().toISOString().slice(0, 10);
  }
  return record;
}

export async function GET(request: Request) {
  if (!isAuthorized(request)) {
    return NextResponse.json({ error: "Unauthorized." }, { status: 401 });
  }
  if (!process.env.ANTHROPIC_API_KEY) {
    return NextResponse.json({ error: "ANTHROPIC_API_KEY is not set." }, { status: 500 });
  }

  const admin = createAdminClient();
  const { data: tools, error } = await admin.from("tools").select("id, schema");
  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  const client = new Anthropic();
  const results: { tool_id: string; automation_id: string; status: "ok" | "error"; detail?: string }[] = [];

  for (const tool of tools ?? []) {
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
          .order("created_at", { ascending: false })
          .limit(14);
        const data = await generateRecord(
          client,
          automation,
          table,
          inputsById,
          (recent ?? []).map((r) => r.data as Record<string, unknown>),
        );
        const { error: insertError } = await admin
          .from("tool_records")
          .insert({ tool_id: tool.id, table_id: automation.target, data });
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
