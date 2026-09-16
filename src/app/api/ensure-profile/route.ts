import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { ensureProfile } from "@/lib/ensureProfile";

export const runtime = "nodejs";

/**
 * Password sign-up/sign-in don't redirect through /auth/callback (that's
 * only hit by email links — magic link, signup confirmation, recovery), so
 * they need to call this explicitly right after a successful auth to get
 * the same workspace-bootstrap step /auth/callback does for email links.
 */
export async function POST(request: Request) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: "Not signed in." }, { status: 401 });
  }

  let invite: string | undefined;
  try {
    const body = await request.json();
    if (typeof body?.invite === "string") invite = body.invite;
  } catch {
    // no body / not JSON — fine, invite is optional
  }

  const result = await ensureProfile(supabase, user.id, user.email, invite);
  if (!result.ok) {
    return NextResponse.json({ error: result.error }, { status: 400 });
  }
  return NextResponse.json({ ok: true });
}
