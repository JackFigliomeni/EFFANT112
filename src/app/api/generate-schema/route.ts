import Anthropic from "@anthropic-ai/sdk";
import { NextResponse } from "next/server";
import { validateToolSchema } from "@/lib/schema";
import { createClient } from "@/lib/supabase/server";
import { checkRateLimit } from "@/lib/generationLimits";

export const runtime = "nodejs";

const SYSTEM_PROMPT = `You turn a plain-language description of a small tool into a JSON schema built from exactly six block types. Output ONLY the JSON object — no prose, no markdown code fences.

Shape:
{
  "blocks": [
    { "type": "input", "id": "<snake_case>", "label": "<question text>", "kind": "text" | "textarea" | "number" | "boolean" | "date" | "time" | "email" | "url" | "select" | "multiselect" | "rating", "options": ["<choice>", ...] },
    { "type": "table", "id": "<snake_case>", "fields": ["<field ids matching input block ids>", ...] },
    { "type": "view", "id": "<snake_case>", "source": "<a table block's id>", "display": "calendar" | "list" | "table" | "count" | "sum" | "average" | "latest" | "chart", "field": "<numeric field, for sum/average/chart>" },
    { "type": "action", "id": "<snake_case>", "does": "add_record" | "update_record" | "delete_record", "target": "<a table block's id>", "label": "<optional button text>", "field": "<boolean field to toggle, for update_record>" },
    { "type": "rule", "id": "<snake_case>", "when": "<plain-language condition>", "then": "<plain-language effect>" },
    { "type": "automation", "id": "<snake_case>", "target": "<a table block's id>", "prompt": "<instruction for Claude, written as if asking a person>", "useWebSearch": true | false }
  ]
}

Rules:
- Every id is unique and snake_case.
- Include at least one input, one table, one view, and one action. Only add a rule block if the description implies a reminder/condition.
- Only add an automation block if the description implies the tool should generate or fetch something on its own on a recurring basis (e.g. "suggest me a recipe every night", "give me a daily writing prompt", "find me a new article to read each day") — NOT for tools where the person is the one entering data. An automation's "target" must be a table whose fields it can plausibly fill in; leave subjective/personal fields (e.g. a rating, or whether they actually did the thing) for the person, not the automation. Set "useWebSearch" true only when the instruction needs a real, current, or specific external fact/link (a real recipe URL, current news, a specific product) rather than something Claude can just compose from general knowledge.
- "options" is REQUIRED (2+ choices) for input kind "select"/"multiselect", and meaningless for every other kind — omit it otherwise.
- "field" on a view is REQUIRED for display "sum"/"average"/"chart" (must be a numeric input's id) and meaningless otherwise.
- "field" on an action is REQUIRED for does "update_record" (must be a boolean input's id — the action becomes a per-row toggle button) and meaningless for "add_record"/"delete_record". "delete_record" needs no "field" — it's a per-row delete button.
- A table's "fields" must be ids of input blocks (plus you may add a "date" field even with no matching input — it's implicit).
- A view's "source", an action's "target", and an automation's "target" must reference an existing table block's id.
- Prefer "calendar" for daily-habit-shaped tools, "table" for structured/multi-field logs, "list" for freeform logs, "count" for simple tallies, "sum"/"average" for numeric totals (spending, hours, etc.), "chart" for a trend over time, "latest" for "what's the most recent entry".
- For a checklist/todo-shaped tool: give the table a boolean field (e.g. "done"), add an "update_record" action with that field to let people check items off, and usually a "delete_record" action too.
- Use "select" for a single choice from a short fixed list (e.g. mood, category), "multiselect" for choosing several, "rating" for a 1-5 scale, "textarea" for freeform notes longer than a line, "email"/"url" for those specific formats.

Example — "a habit tracker":
{"blocks":[{"type":"input","id":"did_it","label":"Did you do it today?","kind":"boolean"},{"type":"table","id":"log","fields":["did_it","date"]},{"type":"view","id":"streak_view","source":"log","display":"calendar"},{"type":"action","id":"mark_done","does":"add_record","target":"log"},{"type":"rule","id":"remind","when":"not marked by 8pm","then":"notify"}]}

Example — "a todo list":
{"blocks":[{"type":"input","id":"task","label":"Task","kind":"text"},{"type":"table","id":"tasks","fields":["task","done"]},{"type":"view","id":"task_list","source":"tasks","display":"list"},{"type":"action","id":"add_task","does":"add_record","target":"tasks","label":"Add task"},{"type":"action","id":"toggle_done","does":"update_record","target":"tasks","field":"done"},{"type":"action","id":"remove_task","does":"delete_record","target":"tasks"}]}

Example — "track my daily spending":
{"blocks":[{"type":"input","id":"amount","label":"Amount ($)","kind":"number"},{"type":"input","id":"category","label":"Category","kind":"select","options":["Food","Transport","Fun","Bills","Other"]},{"type":"table","id":"expenses","fields":["amount","category"]},{"type":"view","id":"total","source":"expenses","display":"sum","field":"amount"},{"type":"view","id":"trend","source":"expenses","display":"chart","field":"amount"},{"type":"action","id":"log_expense","does":"add_record","target":"expenses","label":"Log expense"}]}

Example — "suggest an Italian dinner every night with a real recipe":
{"blocks":[{"type":"input","id":"dish_name","label":"Dish name","kind":"text"},{"type":"input","id":"recipe_link","label":"Recipe link","kind":"url"},{"type":"input","id":"cooked","label":"Actually cooked it?","kind":"boolean"},{"type":"table","id":"dinner_log","fields":["dish_name","recipe_link","cooked","date"]},{"type":"view","id":"dinner_calendar","source":"dinner_log","display":"calendar"},{"type":"action","id":"mark_cooked","does":"update_record","target":"dinner_log","field":"cooked"},{"type":"automation","id":"suggest_dinner","target":"dinner_log","prompt":"Suggest one Italian dinner for tonight and find a real recipe for it online.","useWebSearch":true}]}`;

export async function POST(request: Request) {
  // Require sign-in: this route spends real Anthropic API budget per call,
  // and was previously callable by anyone, signed in or not — including
  // directly via POST, bypassing the /generate page entirely.
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: "Sign in to generate a tool." }, { status: 401 });
  }
  const rateLimit = await checkRateLimit(supabase, user.id);
  if (rateLimit.limited) {
    return NextResponse.json({ error: rateLimit.reason }, { status: 429 });
  }

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

  // Log the attempt before calling Anthropic (not after success) — an
  // errored call still consumed a rate-limit slot, which also protects
  // against retry storms on a flaky/erroring prompt.
  const { error: logError } = await supabase
    .from("generation_requests")
    .insert({ user_id: user.id });
  if (logError) {
    console.error("generate-schema: failed to log rate-limit row", logError.message);
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
