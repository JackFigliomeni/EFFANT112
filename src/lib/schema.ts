// The core data shape: every tool is a JSON `schema` made of six block types.
// This file is the single source of truth for that shape — the Phase 1 engine
// reads it, the Phase 2 builder edits it, and the Phase 3 AI layer generates it.

import { z } from "zod";

export const BLOCK_TYPES = [
  "input",
  "table",
  "view",
  "action",
  "rule",
  "automation",
] as const;
export type BlockType = (typeof BLOCK_TYPES)[number];

export const INPUT_KINDS = [
  "text",
  "textarea",
  "number",
  "boolean",
  "date",
  "time",
  "email",
  "url",
  "select",
  "multiselect",
  "rating",
] as const;
export type InputKind = (typeof INPUT_KINDS)[number];

// select/multiselect need a fixed list of choices to pick from.
const INPUT_KINDS_NEEDING_OPTIONS = ["select", "multiselect"] as const;

export const VIEW_DISPLAYS = [
  "calendar",
  "list",
  "table",
  "count",
  "sum",
  "average",
  "latest",
  "chart",
] as const;
export type ViewDisplay = (typeof VIEW_DISPLAYS)[number];

// sum/average/chart aggregate one specific numeric field across records.
const VIEW_DISPLAYS_NEEDING_FIELD = ["sum", "average", "chart"] as const;

export const ACTION_DOES = ["add_record", "update_record", "delete_record"] as const;
export type ActionDoes = (typeof ACTION_DOES)[number];

const inputBlockSchema = z.object({
  type: z.literal("input"),
  id: z.string().min(1),
  label: z.string().min(1),
  kind: z.enum(INPUT_KINDS),
  // Required (and only meaningful) for kind "select"/"multiselect".
  options: z.array(z.string().min(1)).min(1).max(50).optional(),
});

const tableBlockSchema = z.object({
  type: z.literal("table"),
  id: z.string().min(1),
  fields: z.array(z.string().min(1)).min(1),
});

const viewBlockSchema = z.object({
  type: z.literal("view"),
  id: z.string().min(1),
  source: z.string().min(1),
  display: z.enum(VIEW_DISPLAYS),
  // Required for "sum"/"average"/"chart" — which numeric field to aggregate.
  field: z.string().min(1).optional(),
});

const actionBlockSchema = z.object({
  type: z.literal("action"),
  id: z.string().min(1),
  does: z.enum(ACTION_DOES),
  target: z.string().min(1),
  label: z.string().optional(),
  // Required for "update_record" — which boolean field it toggles. Ignored
  // for "delete_record" (a plain delete-this-row button) and "add_record".
  field: z.string().min(1).optional(),
});

const ruleBlockSchema = z.object({
  type: z.literal("rule"),
  id: z.string().min(1),
  when: z.string().min(1),
  then: z.string().min(1),
});

// Unlike `rule` (a passive, unenforced note), `automation` actually runs —
// once a day, the cron route (src/app/api/cron/automations/route.ts) calls
// Claude with `prompt` and inserts the result as a new record into `target`.
const automationBlockSchema = z.object({
  type: z.literal("automation"),
  id: z.string().min(1),
  target: z.string().min(1),
  prompt: z.string().min(1),
  // Lets Claude use real web search (e.g. to find an actual recipe/article
  // URL) instead of only generating from what it already knows.
  useWebSearch: z.boolean(),
});

export const blockSchema = z
  .discriminatedUnion("type", [
    inputBlockSchema,
    tableBlockSchema,
    viewBlockSchema,
    actionBlockSchema,
    ruleBlockSchema,
    automationBlockSchema,
  ])
  .superRefine((block, ctx) => {
    if (block.type === "input" && INPUT_KINDS_NEEDING_OPTIONS.includes(block.kind as "select" | "multiselect")) {
      if (!block.options || block.options.length === 0) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: `input "${block.id}" of kind "${block.kind}" needs a non-empty "options" list`,
          path: ["options"],
        });
      }
    }
    if (block.type === "view" && VIEW_DISPLAYS_NEEDING_FIELD.includes(block.display as "sum" | "average" | "chart")) {
      if (!block.field) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: `view "${block.id}" with display "${block.display}" needs a "field" to aggregate`,
          path: ["field"],
        });
      }
    }
    if (block.type === "action" && block.does === "update_record" && !block.field) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: `action "${block.id}" with does "update_record" needs a "field" to toggle`,
        path: ["field"],
      });
    }
  });

export type InputBlock = z.infer<typeof inputBlockSchema>;
export type TableBlock = z.infer<typeof tableBlockSchema>;
export type ViewBlock = z.infer<typeof viewBlockSchema>;
export type ActionBlock = z.infer<typeof actionBlockSchema>;
export type RuleBlock = z.infer<typeof ruleBlockSchema>;
export type AutomationBlock = z.infer<typeof automationBlockSchema>;
export type Block = z.infer<typeof blockSchema>;

export const toolSchemaSchema = z.object({
  blocks: z.array(blockSchema).min(1),
});
export type ToolSchema = z.infer<typeof toolSchemaSchema>;

/** Validate an unknown JSON value against the tool schema shape. */
export function validateToolSchema(
  value: unknown,
):
  | { ok: true; schema: ToolSchema }
  | { ok: false; error: string } {
  const result = toolSchemaSchema.safeParse(value);
  if (result.success) {
    return { ok: true, schema: result.data };
  }
  return { ok: false, error: result.error.issues.map((i) => `${i.path.join(".")}: ${i.message}`).join("; ") };
}

/** Create an empty block of a given type with a generated id. */
export function emptyBlock(type: BlockType, id: string): Block {
  switch (type) {
    case "input":
      return { type, id, label: "New question", kind: "text" };
    case "table":
      return { type, id, fields: ["field1"] };
    case "view":
      return { type, id, source: "", display: "list" };
    case "action":
      return { type, id, does: "add_record", target: "" };
    case "rule":
      return { type, id, when: "", then: "" };
    case "automation":
      return { type, id, target: "", prompt: "", useWebSearch: false };
  }
}
