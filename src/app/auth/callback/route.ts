import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { ensureProfile } from "@/lib/ensureProfile";

export const runtime = "nodejs";

/** Only allow redirecting to a same-app relative path — never an
 * absolute/external URL, which would make this an open redirect. */
function safeNextPath(next: string | null): string {
  if (next && next.startsWith("/") && !next.startsWith("//") && !next.includes("://")) {
    return next;
  }
  return "/gallery";
}

/**
 * Handles every email-link auth flow (magic link, password sign-up
 * confirmation, password recovery) — they all redirect here with a `code`
 * to exchange for a session, then ensure the user has a workspace.
 */
export async function GET(request: Request) {
  const url = new URL(request.url);
  const code = url.searchParams.get("code");
  const invite = url.searchParams.get("invite");
  const name = url.searchParams.get("name");
  const next = safeNextPath(url.searchParams.get("next"));

  if (!code) {
    return NextResponse.redirect(new URL("/login?error=missing_code", url.origin));
  }

  const supabase = await createClient();
  const { error: exchangeError } = await supabase.auth.exchangeCodeForSession(code);
  if (exchangeError) {
    return NextResponse.redirect(
      new URL(`/login?error=${encodeURIComponent(exchangeError.message)}`, url.origin),
    );
  }

  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.redirect(new URL("/login?error=no_user", url.origin));
  }

  const result = await ensureProfile(supabase, user.id, user.email, invite, name);
  if (!result.ok) {
    return NextResponse.redirect(new URL(`/login?error=${result.error}`, url.origin));
  }

  return NextResponse.redirect(new URL(next, url.origin));
}
