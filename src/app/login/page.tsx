"use client";

import { Suspense, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
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

type Mode = "signin" | "signup" | "magiclink";

function LoginPageInner() {
  const supabase = createClient();
  const router = useRouter();
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

  const [mode, setMode] = useState<Mode>("signin");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [sent, setSent] = useState(false);
  const [confirmSent, setConfirmSent] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function afterSignedIn() {
    // Password sign-in/sign-up don't go through /auth/callback (that's only
    // hit by email links), so the workspace-bootstrap step has to be
    // triggered explicitly here instead.
    try {
      await fetch("/api/ensure-profile", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ invite }),
      });
    } catch {
      // Non-fatal — gallery/builder will still work, just without a
      // workspace until this succeeds on a later visit.
    }
    router.push("/gallery");
  }

  async function submitPassword() {
    setError(null);
    setLoading(true);
    try {
      if (mode === "signup") {
        const emailRedirectTo = new URL("/auth/callback", window.location.origin);
        if (invite) emailRedirectTo.searchParams.set("invite", invite);
        const { data, error } = await supabase.auth.signUp({
          email,
          password,
          options: { emailRedirectTo: emailRedirectTo.toString() },
        });
        if (error) {
          setError(error.message);
        } else if (data.session) {
          // Email confirmation is off for this project — signed in immediately.
          await afterSignedIn();
        } else {
          // Confirmation required — they'll click a link that lands on
          // /auth/callback, which does the same workspace-bootstrap step.
          setConfirmSent(true);
        }
      } else {
        const { error } = await supabase.auth.signInWithPassword({ email, password });
        if (error) setError(error.message);
        else await afterSignedIn();
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Couldn't reach Supabase.");
    } finally {
      setLoading(false);
    }
  }

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
        <h1 className="text-xl font-semibold">
          {mode === "signup" ? "Create account" : "Sign in"}
        </h1>
        {invite && (
          <p className="text-sm text-black/60 dark:text-white/60">
            You&rsquo;ll join the workspace for invite code <code>{invite}</code>.
          </p>
        )}
      </div>

      {callbackError && (
        <p className="rounded-md bg-red-500/10 px-3 py-2 text-sm text-red-600">{callbackError}</p>
      )}

      {confirmSent ? (
        <p className="text-sm">Check your email to confirm your account.</p>
      ) : mode === "magiclink" ? (
        sent ? (
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
            <button
              onClick={() => setMode("signin")}
              className="w-fit text-xs text-black/50 underline dark:text-white/50"
            >
              Use a password instead
            </button>
          </>
        )
      ) : (
        <>
          <input
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="you@example.com"
            className="rounded-md border border-black/15 px-3 py-2 text-sm dark:border-white/20 dark:bg-transparent"
          />
          <input
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            placeholder={mode === "signup" ? "Choose a password (8+ characters)" : "Password"}
            minLength={8}
            className="rounded-md border border-black/15 px-3 py-2 text-sm dark:border-white/20 dark:bg-transparent"
          />
          <button
            onClick={submitPassword}
            disabled={loading || !email || password.length < 8}
            className="w-fit rounded-md bg-black px-4 py-2 text-sm font-medium text-white hover:bg-black/80 disabled:opacity-50 dark:bg-white dark:text-black"
          >
            {loading ? "…" : mode === "signup" ? "Create account" : "Sign in"}
          </button>

          <div className="flex flex-col gap-1 text-xs">
            <button
              onClick={() => setMode(mode === "signup" ? "signin" : "signup")}
              className="w-fit text-black/50 underline dark:text-white/50"
            >
              {mode === "signup" ? "Already have an account? Sign in" : "New here? Create an account"}
            </button>
            {mode === "signin" && (
              <Link href="/reset-password" className="w-fit text-black/50 underline dark:text-white/50">
                Forgot password?
              </Link>
            )}
            <button
              onClick={() => setMode("magiclink")}
              className="w-fit text-black/50 underline dark:text-white/50"
            >
              Use a magic link instead
            </button>
          </div>
        </>
      )}

      {error && <p className="text-sm text-red-600">{error}</p>}
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
