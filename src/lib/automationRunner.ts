import Anthropic from "@anthropic-ai/sdk";
import type { AutomationBlock, InputBlock, TableBlock } from "@/lib/schema";

// Server-only — calls the Anthropic API. Shared by the daily cron
// (src/app/api/cron/automations) and the free-plan manual test-run route
// (src/app/api/tools/[id]/automations/[automationId]/test-run) so both go
// through the exact same generation + field-constraint logic.
export async function generateAutomationRecord(
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
