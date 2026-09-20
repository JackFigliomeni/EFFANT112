"use client";

import { useState } from "react";
import Link from "next/link";
import { createClient } from "@/lib/supabase/client";
import { Button } from "@/components/ui/button";

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
        redirectTo: new URL("/auth/reset-callback", window.location.origin).toString(),
      });
      if (error) setError(error.message);
      else setSent(true);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Couldn't reach Supabase.");
    }
  }

  return (
    <div className="mx-auto w-full max-w-sm py-20">
      <span className="font-mono text-[10px] uppercase text-signal">Account access</span>
      <h1 className="mt-3 font-display text-3xl font-semibold">Reset your password.</h1>

      {sent ? (
        <p className="mt-10 text-sm">Check your email for a password reset link.</p>
      ) : (
        <div className="mt-10 space-y-5">
          <label className="block text-xs font-medium">
            Email
            <input type="email" value={email} onChange={(e) => setEmail(e.target.value)} className="field mt-1" />
          </label>
          <Button variant="signal" size="lg" className="w-full" onClick={sendResetLink} disabled={!email}>
            Send reset link
          </Button>
          {error && <p className="text-xs text-destructive">{error}</p>}
        </div>
      )}

      <Link href="/login" className="mt-8 inline-block text-xs text-muted-foreground underline">
        Back to sign in
      </Link>
    </div>
  );
}
