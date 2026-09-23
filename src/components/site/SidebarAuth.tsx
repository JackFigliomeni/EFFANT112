import { createClient } from "@/lib/supabase/server";
import { ButtonLink } from "@/components/ui/button";
import { SignOutButton } from "@/components/SignOutButton";

/**
 * Pinned under the sidebar's nav links (and mirrored in the mobile drawer):
 * a compact account row — Settings itself lives in the nav list above.
 * Server Component so only this piece opts into dynamic rendering (see
 * AppShell / root layout).
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
    <div className="flex items-center justify-between gap-2 px-1">
      <span className="truncate text-[11px] text-muted-foreground">{user.email}</span>
      <SignOutButton />
    </div>
  );
}
