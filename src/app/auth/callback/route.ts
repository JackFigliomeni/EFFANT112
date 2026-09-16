import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

export const runtime = "nodejs";

/**
 * Phase 4: handles the magic-link redirect, then ensures the user has a
 * workspace — joins one by invite code if given, otherwise creates a new
 * one ("start simple: one workspace per invite link").
 */
export async function GET(request: Request) {
  const url = new URL(request.url);
  const code = url.searchParams.get("code");
  const invite = url.searchParams.get("invite");

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

  const { data: existingProfile } = await supabase
    .from("profiles")
    .select("id")
    .eq("id", user.id)
    .maybeSingle();

  if (!existingProfile) {
    let workspaceId: string;

    if (invite) {
      const { data: workspace, error: findError } = await supabase
        .from("workspaces")
        .select("id")
        .eq("invite_code", invite)
        .maybeSingle();
      if (findError || !workspace) {
        return NextResponse.redirect(new URL("/login?error=invalid_invite", url.origin));
      }
      workspaceId = workspace.id;
    } else {
      const { data: newWorkspace, error: createError } = await supabase
        .from("workspaces")
        .insert({ name: `${user.email ?? "New"}'s workspace` })
        .select("id")
        .single();
      if (createError || !newWorkspace) {
        return NextResponse.redirect(new URL("/login?error=workspace_create_failed", url.origin));
      }
      workspaceId = newWorkspace.id;
    }

    const { error: profileError } = await supabase
      .from("profiles")
      .insert({ id: user.id, workspace_id: workspaceId });
    if (profileError) {
      return NextResponse.redirect(new URL("/login?error=profile_create_failed", url.origin));
    }
  }

  return NextResponse.redirect(new URL("/gallery", url.origin));
}
