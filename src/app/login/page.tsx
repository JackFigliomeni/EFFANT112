"use client";

import { Suspense, useState } from "react";
import { useSearchParams } from "next/navigation";
import { createClient } from "@/lib/supabase/client";

// Depends on runtime env vars — never prerender it statically at build time.
export const dynamic = "force-dynamic";

const CALLBACK_ERROR_MESSAGES: Record<string, string> = {
  missing_code: "That sign-in link was missing something — try sending a new one.",
  no_user: "Couldn't confirm your account — try signing in again.",
  invalid_invite: "That invite code doesn't match any workspace.",
  workspace_create_failed: "Couldn't create your workspace — try again in a moment.",
  profile_create_failed: "Couldn't finish setting up your account — try again in a moment.",
};

function LoginPageInner() {
  const supabase = createClient();
  const searchParams = useSearchParams();
  const invite = searchParams.get("invite");
  // The /auth/callback route redirects here with ?error=<code> on failure
  // (e.g. an invalid/expired magic link, a bad invite code) — this was
  // previously silently dropped, leaving the user on a blank login page
  // with no explanation.
  const callbackErrorCode = searchParams.get("error");
  const callbackError = callbackErrorCode
    ? CALLBACK_ERROR_MESSAGES[callbackErrorCode] ?? decodeURIComponent(callbackErrorCode)
    : null;

  const [email, setEmail] = useState("");
  const [sent, setSent] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function sendMagicLink() {
    setError(null);
    const redirectTo = new URL("/auth/callback", window.location.origin);
    if (invite) redirectTo.searchParams.set("invite", invite);

    try {
      const { error } = await supabase.auth.signInWithOtp({
        email,
        options: { emailRedirectTo: redirectTo.toString() },
      });
      if (error) setError(error.message);
      else setSent(true);
    } catch (err) {
      // A rejected fetch (bad Supabase URL, network failure, ...) throws
      // instead of returning {error} — without this, clicking the button
      // would silently do nothing.
      setError(err instanceof Error ? err.message : "Couldn't reach Supabase.");
    }
  }

  return (
    <div className="mx-auto flex max-w-sm flex-col gap-4 p-6">
      <div>
        <h1 className="text-xl font-semibold">Sign in</h1>
        {invite && (
          <p className="text-sm text-black/60 dark:text-white/60">
            You&rsquo;ll join the workspace for invite code <code>{invite}</code>.
          </p>
        )}
      </div>

      {callbackError && (
        <p className="rounded-md bg-red-500/10 px-3 py-2 text-sm text-red-600">{callbackError}</p>
      )}

      {sent ? (
        <p className="text-sm">Check your email for a magic link.</p>
      ) : (
        <>
          <input
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="you@example.com"
            className="rounded-md border border-black/15 px-3 py-2 text-sm dark:border-white/20 dark:bg-transparent"
          />
          <button
            onClick={sendMagicLink}
            disabled={!email}
            className="w-fit rounded-md bg-black px-4 py-2 text-sm font-medium text-white hover:bg-black/80 disabled:opacity-50 dark:bg-white dark:text-black"
          >
            Send magic link
          </button>
          {error && <p className="text-sm text-red-600">{error}</p>}
        </>
      )}
    </div>
  );
}

export default function LoginPage() {
  return (
    <Suspense>
      <LoginPageInner />
    </Suspense>
  );
}
