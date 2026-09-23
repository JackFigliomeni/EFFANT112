"use client";

import { Suspense, useState } from "react";
import { useSearchParams } from "next/navigation";
import Link from "next/link";
import posthog from "posthog-js";
import { createClient } from "@/lib/supabase/client";
import { Button } from "@/components/ui/button";

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
  const searchParams = useSearchParams();
  const invite = searchParams.get("invite");
  // The /auth/callback route redirects here with ?error=<code> on failure
  // (an invalid/expired magic link, a bad invite code) — without showing it
  // the user would land on a blank login page with no explanation.
  const callbackErrorCode = searchParams.get("error");
  const callbackError = callbackErrorCode
    ? CALLBACK_ERROR_MESSAGES[callbackErrorCode] ?? decodeURIComponent(callbackErrorCode)
    : null;

  const [mode, setMode] = useState<Mode>(searchParams.get("mode") === "signup" ? "signup" : "signin");
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [sent, setSent] = useState(false);
  const [confirmSent, setConfirmSent] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function afterSignedIn(eventName: "user_signed_in" | "user_signed_up") {
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (user) {
      posthog.identify(user.id, { email: user.email, name: name.trim() || undefined });
      posthog.capture(eventName, { authentication_method: "password" });
    }

    // Password sign-in/sign-up don't go through /auth/callback (that's only
    // hit by email links), so the workspace-bootstrap step has to be
    // triggered explicitly here instead.
    try {
      await fetch("/api/ensure-profile", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ invite, name }),
      });
    } catch {
      // Non-fatal — gallery/builder still work, just without a workspace
      // until this succeeds on a later visit.
    }
    // A full navigation, not router.push(): push()+refresh() reused the root
    // layout's previous (signed-out) render in testing. Sign-in is a rare,
    // one-time action; a full page load is simply reliable.
    window.location.href = "/gallery";
  }

  async function submitPassword() {
    setError(null);
    setLoading(true);
    try {
      if (mode === "signup") {
        const emailRedirectTo = new URL("/auth/callback", window.location.origin);
        if (invite) emailRedirectTo.searchParams.set("invite", invite);
        if (name) emailRedirectTo.searchParams.set("name", name);
        const { data, error } = await supabase.auth.signUp({
          email,
          password,
          options: { emailRedirectTo: emailRedirectTo.toString() },
        });
        if (error) {
          setError(error.message);
        } else if (data.session) {
          await afterSignedIn("user_signed_up");
        } else {
          setConfirmSent(true);
        }
      } else {
        const { error } = await supabase.auth.signInWithPassword({ email, password });
        if (error) setError(error.message);
        else await afterSignedIn("user_signed_in");
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
    if (name) redirectTo.searchParams.set("name", name);
    try {
      const { error } = await supabase.auth.signInWithOtp({
        email,
        options: { emailRedirectTo: redirectTo.toString() },
      });
      if (error) setError(error.message);
      else {
        posthog.capture("magic_link_requested", { has_workspace_invite: Boolean(invite) });
        setSent(true);
      }
    } catch (err) {
      // A rejected fetch throws instead of returning {error} — without this
      // the button would silently do nothing.
      posthog.captureException(err);
      setError(err instanceof Error ? err.message : "Couldn't reach Supabase.");
    }
  }

  return (
    <div className="relative grid min-h-[70vh] place-items-center overflow-hidden py-16">
      <div className="auth-orbit" aria-hidden="true" />
      <section className="relative z-10 w-full max-w-sm">
        <span className="font-mono text-[10px] uppercase text-signal">Account access</span>
        <h1 className="mt-3 font-display text-3xl font-semibold">
          {mode === "signup" ? "Make an account." : "Welcome back."}
        </h1>
        {invite && (
          <p className="mt-3 text-xs text-muted-foreground">
            You&rsquo;ll join the workspace for invite code <code>{invite}</code>.
          </p>
        )}

        {callbackError && <p className="mt-6 border-l-2 border-destructive pl-3 text-xs text-destructive">{callbackError}</p>}

        {confirmSent ? (
          <p className="mt-10 text-sm">Check your email to confirm your account.</p>
        ) : mode === "magiclink" ? (
          sent ? (
            <p className="mt-10 text-sm">Check your email for a magic link.</p>
          ) : (
            <div className="mt-10 space-y-5">
              <label className="block text-xs font-medium">
                Name (optional)
                <input
                  type="text"
                  className="field mt-1"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="Only used if this is a new account"
                />
              </label>
              <label className="block text-xs font-medium">
                Email
                <input type="email" className="field mt-1" value={email} onChange={(e) => setEmail(e.target.value)} />
              </label>
              <Button variant="signal" size="lg" className="w-full" onClick={sendMagicLink} disabled={!email}>
                Send magic link
              </Button>
              <Button variant="quiet" size="sm" onClick={() => setMode("signin")}>
                Use a password instead
              </Button>
            </div>
          )
        ) : (
          <div className="mt-10 space-y-5">
            {mode === "signup" && (
              <label className="block text-xs font-medium">
                Name
                <input type="text" className="field mt-1" value={name} onChange={(e) => setName(e.target.value)} />
              </label>
            )}
            <label className="block text-xs font-medium">
              Email
              <input type="email" className="field mt-1" value={email} onChange={(e) => setEmail(e.target.value)} />
            </label>
            <label className="block text-xs font-medium">
              Password
              <input
                type="password"
                minLength={8}
                className="field mt-1"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder={mode === "signup" ? "8+ characters" : undefined}
              />
            </label>
            <Button
              variant="signal"
              size="lg"
              className="w-full"
              onClick={submitPassword}
              disabled={loading || !email || password.length < 8 || (mode === "signup" && !name.trim())}
            >
              {loading ? "Working…" : mode === "signup" ? "Create account" : "Sign in"}
            </Button>

            <div className="flex flex-wrap items-center justify-between gap-2 text-xs text-muted-foreground">
              <Button variant="quiet" size="sm" onClick={() => setMode(mode === "signup" ? "signin" : "signup")}>
                {mode === "signup" ? "I have an account" : "Create an account"}
              </Button>
              {mode === "signin" && (
                <Link href="/reset-password" className="rounded-full px-3 py-1.5 hover:bg-accent hover:text-foreground">
                  Forgot password?
                </Link>
              )}
              <Button variant="quiet" size="sm" onClick={() => setMode("magiclink")}>
                Use a magic link
              </Button>
            </div>
          </div>
        )}

        {error && <p className="mt-6 text-xs leading-relaxed text-destructive">{error}</p>}
      </section>
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
