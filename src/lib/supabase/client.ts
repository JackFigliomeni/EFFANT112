import { createBrowserClient } from "@supabase/ssr";

// Fall back to obviously-fake placeholders instead of throwing when the env
// vars are unset. This keeps `next build`'s prerendering pass (and any
// environment where these are briefly unset) from crashing outright — real
// calls just fail with a normal network/auth error instead, which the pages
// that use this client already surface with a hint to set these vars.
const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL || "https://placeholder.supabase.co";
const SUPABASE_ANON_KEY = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || "placeholder-anon-key";

/** Supabase client for use in Client Components (browser). */
export function createClient() {
  return createBrowserClient(SUPABASE_URL, SUPABASE_ANON_KEY);
}
