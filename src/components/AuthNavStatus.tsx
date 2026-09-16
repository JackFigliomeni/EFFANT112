import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
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
      <Link href="/login" className="hover:underline hover:text-black dark:hover:text-white">
        Sign in
      </Link>
    );
  }

  return (
    <>
      <span className="text-black/40 dark:text-white/40">{user.email}</span>
      <SignOutButton />
    </>
  );
}
