"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { createClient } from "@/lib/supabase/client";
import { isPlan, PRO_PRICE_DISPLAY, type Plan } from "@/lib/plans";

export const dynamic = "force-dynamic";

export default function SettingsPage() {
  const supabase = createClient();
  const [email, setEmail] = useState<string | null>(null);
  const [plan, setPlan] = useState<Plan | null>(null);
  const [loadingPortal, setLoadingPortal] = useState(false);
  const [portalError, setPortalError] = useState<string | null>(null);
  const [confirmingDelete, setConfirmingDelete] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [deleteError, setDeleteError] = useState<string | null>(null);

  useEffect(() => {
    async function load() {
      const {
        data: { user },
      } = await supabase.auth.getUser();
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

  if (email === null) {
    return (
      <div className="mx-auto max-w-lg p-6 text-sm">
        <p>
          <Link href="/login" className="underline">
            Sign in
          </Link>{" "}
          to see your settings.
        </p>
      </div>
    );
  }

  return (
    <div className="mx-auto flex max-w-lg flex-col gap-8 p-6">
      <div>
        <h1 className="text-xl font-semibold">Settings</h1>
        <p className="text-sm text-black/60 dark:text-white/60">{email}</p>
      </div>

      <div className="flex flex-col gap-3 rounded-lg border border-black/10 p-4 dark:border-white/10">
        <h2 className="text-sm font-semibold">Billing</h2>
        <p className="text-sm text-black/70 dark:text-white/70">
          Current plan: <strong>{plan === "pro" ? `Pro (${PRO_PRICE_DISPLAY})` : "Free"}</strong>
        </p>
        {plan === "pro" ? (
          <>
            <button
              onClick={openBillingPortal}
              disabled={loadingPortal}
              className="w-fit rounded-md border border-black/15 px-3 py-1.5 text-sm hover:bg-black/5 disabled:opacity-50 dark:border-white/20 dark:hover:bg-white/10"
            >
              {loadingPortal ? "Opening…" : "Manage billing / cancel subscription"}
            </button>
            {portalError && <p className="text-sm text-red-600">{portalError}</p>}
          </>
        ) : (
          <Link href="/pricing" className="w-fit text-sm underline">
            Upgrade to Pro
          </Link>
        )}
        <p className="text-xs text-black/40 dark:text-white/40">
          Billing questions?{" "}
          <a href="mailto:billing@effant.tech" className="underline">
            billing@effant.tech
          </a>
        </p>
      </div>

      <div className="flex flex-col gap-3 rounded-lg border border-red-600/30 p-4">
        <h2 className="text-sm font-semibold text-red-600">Delete account</h2>
        <p className="text-sm text-black/70 dark:text-white/70">
          Permanently deletes your account, every tool you own, and all their data. If you have an
          active Pro subscription, it&rsquo;s canceled first. This can&rsquo;t be undone.
        </p>
        {!confirmingDelete ? (
          <button
            onClick={() => setConfirmingDelete(true)}
            className="w-fit text-sm text-red-600 underline hover:text-red-700"
          >
            Delete my account
          </button>
        ) : (
          <div className="flex items-center gap-3">
            <button
              onClick={deleteAccount}
              disabled={deleting}
              className="rounded-md bg-red-600 px-3 py-1.5 text-sm font-medium text-white hover:bg-red-700 disabled:opacity-50"
            >
              {deleting ? "Deleting…" : "Yes, permanently delete everything"}
            </button>
            <button
              onClick={() => setConfirmingDelete(false)}
              className="text-sm text-black/50 underline dark:text-white/50"
            >
              Cancel
            </button>
          </div>
        )}
        {deleteError && <p className="text-sm text-red-600">{deleteError}</p>}
      </div>
    </div>
  );
}
