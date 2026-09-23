import { createClient } from "@/lib/supabase/server";
import { ButtonLink } from "@/components/ui/button";

/**
 * The only two things the bare homepage header offers besides "Start
 * building": Sign in and Sign up. Server Component so only this piece opts
 * into dynamic rendering (see AppShell / root layout).
 */
export async function MarketingAuthActions() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (user) return null;

  return (
    <div className="flex items-center gap-2">
      <ButtonLink href="/login" variant="quiet" size="sm">
        Sign in
      </ButtonLink>
      <ButtonLink href="/login?mode=signup" variant="signal" size="sm">
        Sign up
      </ButtonLink>
    </div>
  );
}
