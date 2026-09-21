import Anthropic from "@anthropic-ai/sdk";
import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { checkRateLimit } from "@/lib/generationLimits";
import { APP_CHANGE_ADDENDUM, APP_SYSTEM_PROMPT } from "@/lib/appPrompt";

export const runtime = "nodejs";
// Writing a whole app takes a while; this is the platform's default ceiling.
export const maxDuration = 300;
// Stop a little before the platform would kill the function, so the person
// gets a real message instead of a silently cut-off document.
const DEADLINE_MS = 270_000;

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
    // Sonnet: a whole app is tens of thousands of tokens, and Opus is too slow
    // to finish inside the function time limit.
    model: "claude-sonnet-5",
    max_tokens: 32000,
    thinking: { type: "adaptive" },
    output_config: { effort: "low" },
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
      let timedOut = false;
      const timer = setTimeout(() => {
        timedOut = true;
        stream.abort();
      }, DEADLINE_MS);
      try {
        const final = await stream.finalMessage();
        if (final.stop_reason === "max_tokens") {
          fail("That app got too big to finish. Ask for something a little smaller, or split it into two.");
        }
      } catch (err) {
        console.error("generate-app: model call failed", err);
        if (timedOut) fail("That app took too long to build. Try describing a smaller version, or build it in two steps.");
        else if (err instanceof Anthropic.APIError && /credit balance/i.test(err.message)) fail("Building is unavailable right now (the AI service is out of credit). Try again later.");
        else fail(err instanceof Anthropic.APIError ? "The AI service returned an error. Please try again." : "Something went wrong while building.");
      } finally {
        clearTimeout(timer);
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
