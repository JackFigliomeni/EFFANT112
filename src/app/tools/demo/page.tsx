"use client";

import { useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { habitTrackerSchema } from "@/lib/exampleSchemas";
import { ToolRenderer } from "@/components/renderer/ToolRenderer";

// This page depends on runtime env vars and live Supabase data — never
// prerender it statically at build time.
export const dynamic = "force-dynamic";

const DEMO_TOOL_NAME = "Habit Tracker (Phase 1 demo)";

/**
 * Phase 1 "Done when": this page proves the engine works end-to-end against
 * the hard-coded habit tracker schema from the roadmap — mark a day done,
 * see it show up in the calendar view, with everything persisted in Supabase.
 */
export default function DemoPage() {
  const supabase = createClient();
  const [toolId, setToolId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;

    async function ensureDemoTool() {
      try {
        const { data: existing, error: selectError } = await supabase
          .from("tools")
          .select("id")
          .eq("name", DEMO_TOOL_NAME)
          .limit(1)
          .maybeSingle();

        if (selectError) {
          if (!cancelled) setError(selectError.message);
          return;
        }
        if (existing) {
          if (!cancelled) setToolId(existing.id);
          return;
        }

        const { data: created, error: insertError } = await supabase
          .from("tools")
          .insert({ name: DEMO_TOOL_NAME, schema: habitTrackerSchema, visibility: "private" })
          .select("id")
          .single();

        if (insertError) {
          if (!cancelled) setError(insertError.message);
          return;
        }
        if (!cancelled) setToolId(created.id);
      } catch (err) {
        // A rejected fetch (bad URL, network/TLS failure, Supabase project
        // paused, ...) throws instead of returning {error} — without this,
        // the page would hang on "Loading…" forever.
        if (!cancelled) {
          setError(err instanceof Error ? `fetch failed: ${err.message}` : "Couldn't reach Supabase.");
        }
      }
    }

    ensureDemoTool();
    return () => {
      cancelled = true;
    };
  }, [supabase]);

  return (
    <div className="mx-auto flex max-w-lg flex-col gap-6 p-6">
      <div>
        <h1 className="text-xl font-semibold">Habit Tracker</h1>
        <p className="text-sm text-black/60 dark:text-white/60">
          Phase 1 engine demo — rendered live from the hard-coded schema in{" "}
          <code>src/lib/exampleSchemas.ts</code>.
        </p>
      </div>

      {error && (
        <div className="rounded-md bg-red-500/10 px-3 py-2 text-sm text-red-600">
          {error}
          {error.includes("fetch") || error.includes("NEXT_PUBLIC") ? (
            <p className="mt-1">
              Have you set <code>NEXT_PUBLIC_SUPABASE_URL</code> /{" "}
              <code>NEXT_PUBLIC_SUPABASE_ANON_KEY</code> in <code>.env.local</code> and run the
              migrations in <code>supabase/migrations</code>?
            </p>
          ) : null}
        </div>
      )}

      {!error && !toolId && <p className="text-sm text-black/50 dark:text-white/50">Loading…</p>}

      {toolId && <ToolRenderer schema={habitTrackerSchema} toolId={toolId} />}
    </div>
  );
}
