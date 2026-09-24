"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { buildAppDocument } from "@/lib/appDocument";

type Store = Record<string, unknown>;

/**
 * Runs a generated app inside a sandboxed iframe and persists what it saves.
 *
 * Where the app's data lives:
 *  - signed in + a saved tool: in `app_state` (private to that user, syncs
 *    across their devices) — so an installed app follows you
 *  - otherwise (signed out, or an unsaved preview): this browser's localStorage
 * Either way it's per person, so someone using your public app never sees or
 * overwrites your data.
 */
export function AppFrame({
  html,
  toolId,
  accent,
  title,
  storageKey,
  className = "",
}: {
  html: string;
  toolId: string | null;
  accent?: string;
  title: string;
  // Distinguishes unsaved previews from each other (a fresh generation must
  // not inherit the previous app's saved data).
  storageKey?: string;
  className?: string;
}) {
  const supabase = createClient();
  const iframeRef = useRef<HTMLIFrameElement>(null);
  const lsKey = `effant:app:${toolId ?? storageKey ?? "preview"}`;
  const [initialStore, setInitialStore] = useState<Store | null>(null);
  // Surfaced when the remote save fails — otherwise it fails in a bare catch
  // and the person has no idea their other devices stopped getting updates.
  const [syncIssue, setSyncIssue] = useState<"full" | "error" | null>(null);
  const userIdRef = useRef<string | null>(null);
  const saveTimer = useRef<ReturnType<typeof setTimeout>>(undefined);
  const accentRef = useRef(accent);
  accentRef.current = accent;

  // Load the app's saved data once per app.
  useEffect(() => {
    let cancelled = false;
    setInitialStore(null);
    async function load() {
      let local: Store = {};
      try {
        local = JSON.parse(localStorage.getItem(lsKey) ?? "{}") ?? {};
      } catch {
        // unreadable / unavailable — start empty
      }
      let store = local;
      try {
        const {
          data: { user },
        } = await supabase.auth.getUser();
        userIdRef.current = user?.id ?? null;
        if (user && toolId) {
          const { data } = await supabase
            .from("app_state")
            .select("data")
            .eq("tool_id", toolId)
            .eq("user_id", user.id)
            .maybeSingle();
          if (data?.data && typeof data.data === "object") store = data.data as Store;
        }
      } catch {
        // app_state not created yet (migration 0017) or offline — local data still works
      }
      if (!cancelled) setInitialStore(store);
    }
    load();
    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [toolId, lsKey]);

  // The app posts its whole store whenever it changes.
  useEffect(() => {
    function onMessage(e: MessageEvent) {
      if (e.source !== iframeRef.current?.contentWindow) return;
      const m = e.data;
      if (!m || m.__effant !== 1 || m.type !== "store" || typeof m.store !== "object") return;
      try {
        localStorage.setItem(lsKey, JSON.stringify(m.store));
      } catch {
        // storage full or blocked — the remote copy below still saves
      }
      const uid = userIdRef.current;
      if (!uid || !toolId) return;
      clearTimeout(saveTimer.current);
      saveTimer.current = setTimeout(async () => {
        try {
          const { error } = await supabase
            .from("app_state")
            .upsert({ tool_id: toolId, user_id: uid, data: m.store, updated_at: new Date().toISOString() }, { onConflict: "tool_id,user_id" });
          setSyncIssue(error ? (error.message.includes("app_state_size_check") ? "full" : "error") : null);
        } catch {
          // best effort — localStorage already has it
          setSyncIssue("error");
        }
      }, 1200);
    }
    window.addEventListener("message", onMessage);
    return () => {
      window.removeEventListener("message", onMessage);
      clearTimeout(saveTimer.current);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [toolId, lsKey]);

  // Changing the accent updates the running app; it doesn't reload it.
  useEffect(() => {
    if (accent) iframeRef.current?.contentWindow?.postMessage({ __effant: 1, type: "accent", value: accent }, "*");
  }, [accent]);

  const srcDoc = useMemo(
    () =>
      initialStore
        ? buildAppDocument(html, { mode: "embedded", store: initialStore, accent: accentRef.current })
        : null,
    [html, initialStore],
  );

  if (srcDoc === null) {
    return <div className={`grid place-items-center text-xs text-muted-foreground ${className}`}>Loading…</div>;
  }
  return (
    <div className={`relative overflow-hidden ${className}`}>
      <iframe
        ref={iframeRef}
        title={title}
        srcDoc={srcDoc}
        sandbox="allow-scripts allow-modals allow-downloads"
        allow="clipboard-write"
        referrerPolicy="no-referrer"
        className="block h-full w-full border-0 bg-white"
      />
      {syncIssue && (
        <div className="absolute inset-x-0 bottom-0 flex items-center justify-between gap-2 bg-destructive/90 px-3 py-1.5 text-[10px] leading-snug text-destructive-foreground">
          <span>
            {syncIssue === "full"
              ? "This app's saved data is full — new changes aren't syncing to your other devices."
              : "Couldn't sync to your other devices just now — this one still has your changes."}
          </span>
          <button onClick={() => setSyncIssue(null)} className="shrink-0 underline">
            Dismiss
          </button>
        </div>
      )}
    </div>
  );
}
