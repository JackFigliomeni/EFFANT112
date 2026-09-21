import Anthropic from "@anthropic-ai/sdk";
import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { checkRateLimit } from "@/lib/generationLimits";
import { APP_CHANGE_ADDENDUM, APP_SYSTEM_PROMPT } from "@/lib/appPrompt";

export const runtime = "nodejs";
// Writing a whole app takes a while; this is the platform's default ceiling.
export const maxDuration = 300;

const MAX_PROMPT = 3000;
const MAX_HTML = 90000;

/**
 * Builds (or changes) an app and streams the HTML back as it's written, so
 * the page can show it being made instead of a spinner. Everything that can
 * fail *before* the model starts (sign-in, quota, bad input) comes back as a
 * normal JSON error; a failure after streaming has begun is reported in-band
 * as a final `<!--EFFANT_ERROR:...-->` line, since the status code has
 * already been sent by then.
 */
export async function POST(request: Request) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: "Sign in to build an app." }, { status: 401 });
  }

  let prompt: unknown;
  let currentHtml: unknown;
  try {
    const body = await request.json();
    prompt = body.prompt;
    currentHtml = body.currentHtml;
  } catch {
    return NextResponse.json({ error: "Invalid request body." }, { status: 400 });
  }
  if (typeof prompt !== "string" || prompt.trim().length === 0) {
    return NextResponse.json({ error: "Describe what you want first." }, { status: 400 });
  }
  if (prompt.length > MAX_PROMPT) {
    return NextResponse.json({ error: `Keep the description under ${MAX_PROMPT} characters.` }, { status: 400 });
  }
  if (currentHtml !== undefined && (typeof currentHtml !== "string" || currentHtml.length > MAX_HTML)) {
    return NextResponse.json({ error: "That app is too large to change here." }, { status: 400 });
  }

  const rateLimit = await checkRateLimit(supabase, user.id);
  if (rateLimit.limited) {
    return NextResponse.json({ error: rateLimit.reason }, { status: 429 });
  }
  if (!process.env.ANTHROPIC_API_KEY) {
    return NextResponse.json({ error: "ANTHROPIC_API_KEY is not set on the server." }, { status: 500 });
  }

  // Logged before the call, not after: a failed call still cost a quota slot,
  // which also stops retry storms on a prompt that keeps erroring.
  const { error: logError } = await supabase.from("generation_requests").insert({ user_id: user.id });
  if (logError) console.error("generate-app: failed to log rate-limit row", logError.message);

  const isChange = typeof currentHtml === "string" && currentHtml.length > 0;
  const userContent = isChange
    ? `<current_app>\n${currentHtml}\n</current_app>\n\nChange to make: ${prompt.trim()}`
    : `Build this app: ${prompt.trim()}`;

  const client = new Anthropic();
  const stream = client.messages.stream({
    model: "claude-opus-5",
    max_tokens: 32000,
    thinking: { type: "adaptive" },
    output_config: { effort: "medium" },
    system: APP_SYSTEM_PROMPT + (isChange ? APP_CHANGE_ADDENDUM : ""),
    messages: [{ role: "user", content: userContent }],
  });

  const encoder = new TextEncoder();
  const body = new ReadableStream<Uint8Array>({
    async start(controller) {
      const fail = (message: string) => {
        controller.enqueue(encoder.encode(`\n<!--EFFANT_ERROR:${message.replace(/-->/g, "")}-->`));
      };
      stream.on("text", (delta) => controller.enqueue(encoder.encode(delta)));
      try {
        const final = await stream.finalMessage();
        if (final.stop_reason === "max_tokens") {
          fail("That app got too big to finish. Ask for something a little smaller, or split it into two.");
        }
      } catch (err) {
        console.error("generate-app: model call failed", err);
        fail(err instanceof Anthropic.APIError ? `The model returned an error: ${err.message}` : "Something went wrong while building.");
      } finally {
        controller.close();
      }
    },
    cancel() {
      stream.abort();
    },
  });

  return new Response(body, {
    headers: { "Content-Type": "text/plain; charset=utf-8", "Cache-Control": "no-store", "X-Accel-Buffering": "no" },
  });
}
