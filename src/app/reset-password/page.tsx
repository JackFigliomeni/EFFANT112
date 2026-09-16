"use client";

import { useState } from "react";
import Link from "next/link";
import { createClient } from "@/lib/supabase/client";

export const dynamic = "force-dynamic";

export default function ResetPasswordPage() {
  const supabase = createClient();
  const [email, setEmail] = useState("");
  const [sent, setSent] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function sendResetLink() {
    setError(null);
    try {
      const { error } = await supabase.auth.resetPasswordForEmail(email, {
        redirectTo: new URL("/auth/callback?next=/update-password", window.location.origin).toString(),
      });
      if (error) setError(error.message);
      else setSent(true);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Couldn't reach Supabase.");
    }
  }

  return (
    <div className="mx-auto flex max-w-sm flex-col gap-4 p-6">
      <div>
        <h1 className="text-xl font-semibold">Reset password</h1>
      </div>

      {sent ? (
        <p className="text-sm">Check your email for a password reset link.</p>
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
            onClick={sendResetLink}
            disabled={!email}
            className="w-fit rounded-md bg-black px-4 py-2 text-sm font-medium text-white hover:bg-black/80 disabled:opacity-50 dark:bg-white dark:text-black"
          >
            Send reset link
          </button>
          {error && <p className="text-sm text-red-600">{error}</p>}
        </>
      )}

      <Link href="/login" className="w-fit text-xs text-black/50 underline dark:text-white/50">
        Back to sign in
      </Link>
    </div>
  );
}
