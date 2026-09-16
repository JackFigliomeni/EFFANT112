import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { ensureProfile } from "@/lib/ensureProfile";

export const runtime = "nodejs";

/**
 * Dedicated callback for the password-recovery link specifically — kept
 * separate from /auth/callback because Supabase's redirect_to validation
 * for the recovery flow doesn't honor a query string appended to the
 * redirect URL (confirmed: even with a `/**` wildcard allow-list entry, it
 * still fell back to the bare Site URL). A clean path with no query string
 * matches the same way the already-working signup/magic-link flows do.
 */
export async function GET(request: Request) {
  const url = new URL(request.url);
  const code = url.searchParams.get("code");

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
  if (user) {
    // Harmless/idempotent if they already have one — just a safety net.
    await ensureProfile(supabase, user.id, user.email);
  }

  return NextResponse.redirect(new URL("/update-password", url.origin));
}
