"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { createClient } from "@/lib/supabase/client";
import { Button } from "@/components/ui/button";
import { isPlan, PRO_PRICE_DISPLAY, type Plan } from "@/lib/plans";

export const dynamic = "force-dynamic";

export default function SettingsPage() {
  const supabase = createClient();
  const [email, setEmail] = useState<string | null>(null);
  const [plan, setPlan] = useState<Plan | null>(null);
  const [loadingPortal, setLoadingPortal] = useState(false);
  const [portalError, setPortalError] = useState<string | null>(null);
  const [newPassword, setNewPassword] = useState("");
  const [passwordMessage, setPasswordMessage] = useState<string | null>(null);
  const [confirmingDelete, setConfirmingDelete] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [deleteError, setDeleteError] = useState<string | null>(null);
  const [checked, setChecked] = useState(false);

  useEffect(() => {
    async function load() {
      const {
        data: { user },
      } = await supabase.auth.getUser();
      setChecked(true);
      if (!user) return;
      setEmail(user.email ?? null);
      const { data: profile } = await supabase.from("profiles").select("plan").eq("id", user.id).maybeSingle();
      setPlan(isPlan(profile?.plan) ? profile.plan : "free");
    }
    load();
  }, [supabase]);

  async function openBillingPortal() {
    setLoadingPortal(true);
    setPortalError(null);
    try {
      const res = await fetch("/api/stripe/portal", { method: "POST" });
      const body = await res.json();
      if (!res.ok) {
        setPortalError(body.error ?? "Couldn't open the billing portal.");
        return;
      }
      window.location.href = body.url;
    } catch {
      setPortalError("Couldn't reach the server.");
    } finally {
      setLoadingPortal(false);
    }
  }

  async function changePassword() {
    setPasswordMessage(null);
    const { error } = await supabase.auth.updateUser({ password: newPassword });
    setPasswordMessage(error?.message ?? "Password updated.");
    if (!error) setNewPassword("");
  }

  async function deleteAccount() {
    setDeleting(true);
    setDeleteError(null);
    try {
      const res = await fetch("/api/account/delete", { method: "POST" });
      const body = await res.json();
      if (!res.ok) {
        setDeleteError(body.error ?? "Couldn't delete your account.");
        setDeleting(false);
        return;
      }
      await supabase.auth.signOut();
      window.location.href = "/";
    } catch {
      setDeleteError("Couldn't reach the server.");
      setDeleting(false);
    }
  }

  if (checked && email === null) {
    return (
      <div className="mx-auto max-w-lg py-24 text-sm">
        <Link href="/login" className="underline">
          Sign in
        </Link>{" "}
        to see your settings.
      </div>
    );
  }

  return (
    <section className="mx-auto max-w-4xl py-8">
      <span className="font-mono text-[10px] uppercase text-signal">Settings</span>
      <h1 className="mt-3 text-3xl font-semibold">Your account, your terms.</h1>
      <p className="mt-2 text-xs text-muted-foreground">{email}</p>

      <div className="mt-12 grid gap-14 md:grid-cols-2">
        <div className="space-y-5">
          <h2 className="text-sm font-semibold">Billing</h2>
          <p className="text-sm text-muted-foreground">
            Current plan: <strong className="text-foreground">{plan === "pro" ? `Pro (${PRO_PRICE_DISPLAY})` : plan === "free" ? "Free" : "…"}</strong>
          </p>
          {plan === "pro" ? (
            <>
              <Button variant="glass" onClick={openBillingPortal} disabled={loadingPortal}>
                {loadingPortal ? "Opening…" : "Manage billing or cancel"}
              </Button>
              {portalError && <p className="text-xs text-destructive">{portalError}</p>}
            </>
          ) : (
            plan === "free" && (
              <Link href="/pricing" className="inline-block text-sm underline">
                Upgrade to Pro
              </Link>
            )
          )}
          <p className="text-xs text-muted-foreground">
            Billing questions?{" "}
            <a href="mailto:billing@effant.tech" className="underline">
              billing@effant.tech
            </a>
          </p>
        </div>

        <div className="space-y-5">
          <h2 className="text-sm font-semibold">Account security</h2>
          <label className="block text-xs text-muted-foreground">
            New password
            <input
              type="password"
              minLength={8}
              className="field mt-1 text-foreground"
              value={newPassword}
              onChange={(e) => setNewPassword(e.target.value)}
              placeholder="8+ characters"
            />
          </label>
          <Button variant="ink" onClick={changePassword} disabled={newPassword.length < 8}>
            Change password
          </Button>
          {passwordMessage && <p className="border-l-2 border-signal pl-3 text-xs text-muted-foreground">{passwordMessage}</p>}
        </div>
      </div>

      <div className="mt-16 border-t border-border pt-10">
        <h2 className="text-sm font-semibold text-destructive">Delete account</h2>
        <p className="mt-3 max-w-xl text-xs leading-relaxed text-muted-foreground">
          Permanently deletes your account, every tool you own, and all their data. If you have an active
          Pro subscription, it&rsquo;s canceled first. This can&rsquo;t be undone.
        </p>
        <div className="mt-5">
          {!confirmingDelete ? (
            <Button variant="quiet" onClick={() => setConfirmingDelete(true)} className="text-destructive hover:text-destructive">
              Delete my account
            </Button>
          ) : (
            <div className="flex flex-wrap items-center gap-3">
              <Button variant="destructive" onClick={deleteAccount} disabled={deleting}>
                {deleting ? "Deleting…" : "Yes, permanently delete everything"}
              </Button>
              <Button variant="quiet" size="sm" onClick={() => setConfirmingDelete(false)}>
                Cancel
              </Button>
            </div>
          )}
          {deleteError && <p className="mt-3 text-xs text-destructive">{deleteError}</p>}
        </div>
      </div>
    </section>
  );
}
