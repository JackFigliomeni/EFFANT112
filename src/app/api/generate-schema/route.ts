import Anthropic from "@anthropic-ai/sdk";
import { NextResponse } from "next/server";
import { validateToolSchema } from "@/lib/schema";

export const runtime = "nodejs";

const SYSTEM_PROMPT = `You turn a plain-language description of a small tool into a JSON schema built from exactly six block types. Output ONLY the JSON object — no prose, no markdown code fences.

Shape:
{
  "blocks": [
    { "type": "input", "id": "<snake_case>", "label": "<question text>", "kind": "boolean" | "text" | "number" | "date" },
    { "type": "table", "id": "<snake_case>", "fields": ["<field ids matching input block ids>", ...] },
    { "type": "view", "id": "<snake_case>", "source": "<a table block's id>", "display": "calendar" | "list" | "table" | "count" },
    { "type": "action", "id": "<snake_case>", "does": "add_record" | "update_record" | "delete_record", "target": "<a table block's id>", "label": "<optional button text>" },
    { "type": "rule", "id": "<snake_case>", "when": "<plain-language condition>", "then": "<plain-language effect>" }
  ]
}

Rules:
- Every id is unique and snake_case.
- Include at least one input, one table, one view, and one action. Only add a rule block if the description implies a reminder/condition.
- A table's "fields" must be ids of input blocks (plus you may add a "date" field even with no matching input — it's implicit).
- A view's "source" and an action's "target" must reference an existing table block's id.
- Prefer "calendar" for daily-habit-shaped tools, "table" for structured logs, "list" for freeform logs, "count" for simple tallies.

Example — "a habit tracker":
{"blocks":[{"type":"input","id":"did_it","label":"Did you do it today?","kind":"boolean"},{"type":"table","id":"log","fields":["did_it","date"]},{"type":"view","id":"streak_view","source":"log","display":"calendar"},{"type":"action","id":"mark_done","does":"add_record","target":"log"},{"type":"rule","id":"remind","when":"not marked by 8pm","then":"notify"}]}`;

export async function POST(request: Request) {
  let prompt: string;
  try {
    const body = await request.json();
    prompt = body.prompt;
  } catch {
    return NextResponse.json({ error: "Invalid request body." }, { status: 400 });
  }

  if (!prompt || typeof prompt !== "string" || prompt.trim().length === 0) {
    return NextResponse.json({ error: "`prompt` is required." }, { status: 400 });
  }

  if (!process.env.ANTHROPIC_API_KEY) {
    return NextResponse.json(
      { error: "ANTHROPIC_API_KEY is not set on the server." },
      { status: 500 },
    );
  }

  const client = new Anthropic();

  let responseText: string;
  try {
    const response = await client.messages.create({
      model: "claude-opus-5",
      max_tokens: 4096,
      system: SYSTEM_PROMPT,
      messages: [{ role: "user", content: `Tool description: ${prompt}` }],
    });
    const textBlock = response.content.find((b) => b.type === "text");
    if (!textBlock || textBlock.type !== "text") {
      return NextResponse.json({ error: "Claude returned no text content." }, { status: 502 });
    }
    responseText = textBlock.text;
  } catch (err) {
    if (err instanceof Anthropic.APIError) {
      console.error("generate-schema: Anthropic API error", err.status, err.message);
      return NextResponse.json({ error: `Anthropic API error: ${err.message}` }, { status: 502 });
    }
    console.error("generate-schema: unexpected error", err);
    throw err;
  }

  let parsed: unknown;
  try {
    // Claude was told to output raw JSON, but strip code fences defensively
    // in case it wraps the output anyway.
    const cleaned = responseText.trim().replace(/^```(?:json)?\n?/, "").replace(/\n?```$/, "");
    parsed = JSON.parse(cleaned);
  } catch {
    return NextResponse.json(
      { error: "Claude's response wasn't valid JSON.", raw: responseText },
      { status: 502 },
    );
  }

  const validation = validateToolSchema(parsed);
  if (!validation.ok) {
    return NextResponse.json(
      { error: `Generated schema failed validation: ${validation.error}`, raw: parsed },
      { status: 422 },
    );
  }

  return NextResponse.json({ schema: validation.schema });
}
