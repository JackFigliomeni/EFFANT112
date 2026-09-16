"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";

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
      <div className="mx-auto max-w-sm p-6 text-sm">
        This reset link is invalid or expired.{" "}
        <a href="/reset-password" className="underline">
          Request a new one
        </a>
        .
      </div>
    );
  }

  return (
    <div className="mx-auto flex max-w-sm flex-col gap-4 p-6">
      <h1 className="text-xl font-semibold">Set a new password</h1>

      {done ? (
        <p className="text-sm">Password updated — redirecting…</p>
      ) : (
        <>
          <input
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            placeholder="New password (8+ characters)"
            minLength={8}
            className="rounded-md border border-black/15 px-3 py-2 text-sm dark:border-white/20 dark:bg-transparent"
          />
          <button
            onClick={save}
            disabled={saving || password.length < 8}
            className="w-fit rounded-md bg-black px-4 py-2 text-sm font-medium text-white hover:bg-black/80 disabled:opacity-50 dark:bg-white dark:text-black"
          >
            {saving ? "Saving…" : "Update password"}
          </button>
          {error && <p className="text-sm text-red-600">{error}</p>}
        </>
      )}
    </div>
  );
}
