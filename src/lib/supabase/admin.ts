import { createClient as createSupabaseClient } from "@supabase/supabase-js";

// SERVICE ROLE — bypasses every RLS policy. Only ever import this from a
// server-only file that never runs in a browser context (a webhook handler
// verified by a third party's signature, e.g.), and never from anything a
// client component could reach. Every other part of this app deliberately
// uses the anon key + RLS instead (see lib/supabase/client.ts and
// server.ts) — this file exists only because the Stripe webhook route has
// no logged-in user to scope a normal request to, by definition.
const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL || "https://placeholder.supabase.co";
const SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY || "placeholder-service-role-key";

export function createAdminClient() {
  return createSupabaseClient(SUPABASE_URL, SERVICE_ROLE_KEY, {
    auth: { autoRefreshToken: false, persistSession: false },
  });
}
