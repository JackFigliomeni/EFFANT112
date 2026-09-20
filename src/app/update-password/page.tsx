"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { Button } from "@/components/ui/button";

export const dynamic = "force-dynamic";

export default function UpdatePasswordPage() {
  const supabase = createClient();
  const router = useRouter();
  const [checking, setChecking] = useState(true);
  const [hasSession, setHasSession] = useState(false);
  const [password, setPassword] = useState("");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [done, setDone] = useState(false);

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      setHasSession(Boolean(session));
      setChecking(false);
    });
  }, [supabase]);

  async function save() {
    setError(null);
    setSaving(true);
    try {
      const { error } = await supabase.auth.updateUser({ password });
      if (error) setError(error.message);
      else {
        setDone(true);
        setTimeout(() => router.push("/gallery"), 1500);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Couldn't reach Supabase.");
    } finally {
      setSaving(false);
    }
  }

  if (checking) return null;

  if (!hasSession) {
    return (
      <div className="mx-auto max-w-sm py-24 text-sm">
        This reset link is invalid or expired.{" "}
        <a href="/reset-password" className="underline">
          Request a new one
        </a>
        .
      </div>
    );
  }

  return (
    <div className="mx-auto w-full max-w-sm py-20">
      <span className="font-mono text-[10px] uppercase text-signal">Account access</span>
      <h1 className="mt-3 font-display text-3xl font-semibold">Set a new password.</h1>

      {done ? (
        <p className="mt-10 text-sm">Password updated. Taking you to your workspace…</p>
      ) : (
        <div className="mt-10 space-y-5">
          <label className="block text-xs font-medium">
            New password
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="8+ characters"
              minLength={8}
              className="field mt-1"
            />
          </label>
          <Button variant="signal" size="lg" className="w-full" onClick={save} disabled={saving || password.length < 8}>
            {saving ? "Saving…" : "Save password"}
          </Button>
          {error && <p className="text-xs text-destructive">{error}</p>}
        </div>
      )}
    </div>
  );
}
