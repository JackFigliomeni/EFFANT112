import { createClient } from "@/lib/supabase/server";
import { ButtonLink } from "@/components/ui/button";
import { SignOutButton } from "@/components/SignOutButton";
import { PostHogIdentify } from "@/components/PostHogIdentify";

/**
 * Pinned under the sidebar's nav links (and mirrored in the mobile drawer):
 * Settings plus a compact account row. Server Component so only this piece
 * opts into dynamic rendering (see AppShell / root layout).
 */
export async function SidebarAuth() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return (
      <ButtonLink href="/login" variant="quiet" size="sm" className="w-full">
        Sign in
      </ButtonLink>
    );
  }

  return (
    <div className="flex flex-col gap-2">
      <PostHogIdentify userId={user.id} email={user.email} />
      <ButtonLink href="/settings" variant="quiet" size="sm" className="w-full">
        Settings
      </ButtonLink>
      <div className="flex items-center justify-between gap-2 px-1">
        <span className="truncate text-[11px] text-muted-foreground">{user.email}</span>
        <SignOutButton />
      </div>
    </div>
  );
}
