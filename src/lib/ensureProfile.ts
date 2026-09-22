import type { SupabaseClient } from "@supabase/supabase-js";
import { isMissingColumn } from "@/lib/toolColumns";

export type EnsureProfileError =
  | "invalid_invite"
  | "workspace_create_failed"
  | "profile_create_failed";

/**
 * Every signed-in user needs a workspace (Phase 4: "start simple, one
 * workspace per invite link") — joins one by invite code if given,
 * otherwise creates a new one. Idempotent: does nothing if the profile
 * already exists. Shared across every sign-in path (magic link, password
 * sign-up/sign-in, password recovery) so none of them skip this step.
 */
export async function ensureProfile(
  supabase: SupabaseClient,
  userId: string,
  userEmail: string | null | undefined,
  inviteCode?: string | null,
  displayName?: string | null,
): Promise<{ ok: true } | { ok: false; error: EnsureProfileError }> {
  const { data: existingProfile } = await supabase
    .from("profiles")
    .select("id")
    .eq("id", userId)
    .maybeSingle();

  if (existingProfile) return { ok: true };

  const name = displayName?.trim() || null;
  let workspaceId: string;

  if (inviteCode) {
    const { data: workspace, error: findError } = await supabase
      .from("workspaces")
      .select("id")
      .eq("invite_code", inviteCode)
      .maybeSingle();
    if (findError || !workspace) return { ok: false, error: "invalid_invite" };
    workspaceId = workspace.id;
  } else {
    const { data: newWorkspace, error: createError } = await supabase
      .from("workspaces")
      .insert({ name: `${name ?? userEmail ?? "New"}'s workspace` })
      .select("id")
      .single();
    if (createError || !newWorkspace) return { ok: false, error: "workspace_create_failed" };
    workspaceId = newWorkspace.id;
  }

  let { error: profileError } = await supabase
    .from("profiles")
    .insert({ id: userId, workspace_id: workspaceId, display_name: name });
  // display_name is a newer column (migration 0018) — if it hasn't reached
  // this environment's database yet, still create the profile without it
  // rather than blocking sign-in entirely.
  if (isMissingColumn(profileError)) {
    ({ error: profileError } = await supabase.from("profiles").insert({ id: userId, workspace_id: workspaceId }));
  }
  if (profileError) return { ok: false, error: "profile_create_failed" };

  return { ok: true };
}
