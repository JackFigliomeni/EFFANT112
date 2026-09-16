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
] as const;
export type BlockType = (typeof BLOCK_TYPES)[number];

export const INPUT_KINDS = ["boolean", "text", "number", "date"] as const;
export type InputKind = (typeof INPUT_KINDS)[number];

export const VIEW_DISPLAYS = ["calendar", "list", "table", "count"] as const;
export type ViewDisplay = (typeof VIEW_DISPLAYS)[number];

export const ACTION_DOES = ["add_record", "update_record", "delete_record"] as const;
export type ActionDoes = (typeof ACTION_DOES)[number];

const inputBlockSchema = z.object({
  type: z.literal("input"),
  id: z.string().min(1),
  label: z.string().min(1),
  kind: z.enum(INPUT_KINDS),
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
});

const actionBlockSchema = z.object({
  type: z.literal("action"),
  id: z.string().min(1),
  does: z.enum(ACTION_DOES),
  target: z.string().min(1),
  label: z.string().optional(),
});

const ruleBlockSchema = z.object({
  type: z.literal("rule"),
  id: z.string().min(1),
  when: z.string().min(1),
  then: z.string().min(1),
});

export const blockSchema = z.discriminatedUnion("type", [
  inputBlockSchema,
  tableBlockSchema,
  viewBlockSchema,
  actionBlockSchema,
  ruleBlockSchema,
]);

export type InputBlock = z.infer<typeof inputBlockSchema>;
export type TableBlock = z.infer<typeof tableBlockSchema>;
export type ViewBlock = z.infer<typeof viewBlockSchema>;
export type ActionBlock = z.infer<typeof actionBlockSchema>;
export type RuleBlock = z.infer<typeof ruleBlockSchema>;
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
  }
}
