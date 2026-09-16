import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";

// See the matching comment in lib/supabase/client.ts — same rationale. This
// one matters even more since it runs on every request via src/proxy.ts.
const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL || "https://placeholder.supabase.co";
const SUPABASE_ANON_KEY = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || "placeholder-anon-key";

/** Refreshes the Supabase auth session on every request. Called from src/proxy.ts. */
export async function updateSession(request: NextRequest) {
  let supabaseResponse = NextResponse.next({ request });

  const supabase = createServerClient(
    SUPABASE_URL,
    SUPABASE_ANON_KEY,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll();
        },
        setAll(cookiesToSet) {
          for (const { name, value } of cookiesToSet) {
            request.cookies.set(name, value);
          }
          supabaseResponse = NextResponse.next({ request });
          for (const { name, value, options } of cookiesToSet) {
            supabaseResponse.cookies.set(name, value, options);
          }
        },
      },
    },
  );

  // Required to keep the session alive — do not remove this call.
  await supabase.auth.getUser();

  return supabaseResponse;
}
