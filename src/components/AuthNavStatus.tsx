import { createClient } from "@/lib/supabase/server";
import { ButtonLink } from "@/components/ui/button";
import { SignOutButton } from "./SignOutButton";

/**
 * Isolated in its own Server Component (rather than checked in the root
 * layout directly) so only this piece opts into dynamic rendering —
 * checking auth in the root layout itself would force the entire site
 * dynamic, losing static optimization on every page.
 */
export async function AuthNavStatus() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return (
      <ButtonLink href="/login" variant="quiet" size="sm">
        Sign in
      </ButtonLink>
    );
  }

  return (
    <div className="flex items-center gap-1">
      <ButtonLink href="/settings" variant="quiet" size="sm">
        Settings
      </ButtonLink>
      <SignOutButton />
      <span className="hidden text-xs text-muted-foreground xl:inline">{user.email}</span>
    </div>
  );
}
