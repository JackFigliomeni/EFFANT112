"use client";

import { useCallback, useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import type { ToolSchema, TableBlock } from "@/lib/schema";
import { ViewBlockRenderer } from "./blocks/ViewBlockRenderer";

type Row = { id: string; data: Record<string, unknown>; created_at: string };

/**
 * Phase 1 engine: given a tool's `schema` (input/table/view/action/rule
 * blocks) and the row id of that tool in the `tools` table, renders a fully
 * working interactive page — inputs write to a draft, actions persist that
 * draft to Supabase, and views read straight back out of it.
 */
export function ToolRenderer({ schema, toolId }: { schema: ToolSchema; toolId: string }) {
  const supabase = createClient();
  const [draft, setDraft] = useState<Record<string, unknown>>({});
  const [rowsByTable, setRowsByTable] = useState<Record<string, Row[]>>({});
  const [status, setStatus] = useState<string | null>(null);

  const tableBlocks = schema.blocks.filter((b): b is TableBlock => b.type === "table");

  const fetchTable = useCallback(
    async (tableId: string) => {
      try {
        const { data, error } = await supabase
          .from("tool_records")
          .select("id, data, created_at")
          .eq("tool_id", toolId)
          .eq("table_id", tableId)
          .order("created_at", { ascending: false });

        if (error) {
          setStatus(`Couldn't load "${tableId}": ${error.message}`);
          return;
        }
        setRowsByTable((prev) => ({ ...prev, [tableId]: data ?? [] }));
      } catch (err) {
        // A rejected fetch (network/TLS failure, bad Supabase URL, ...)
        // throws instead of returning {error} — surface it instead of
        // leaving the view silently empty.
        setStatus(err instanceof Error ? `Couldn't load "${tableId}": ${err.message}` : `Couldn't load "${tableId}".`);
      }
    },
    [supabase, toolId],
  );

  useEffect(() => {
    for (const table of tableBlocks) {
      fetchTable(table.id);
    }
    // Table block ids are static for a given schema — fine to run once per schema/tool.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [toolId]);

  async function handleAction(actionTarget: string, does: string) {
    setStatus(null);
    if (does === "add_record") {
      const table = tableBlocks.find((t) => t.id === actionTarget);
      const data = table
        ? Object.fromEntries(table.fields.map((f) => [f, draft[f] ?? null]))
        : draft;

      try {
        const { error } = await supabase.from("tool_records").insert({
          tool_id: toolId,
          table_id: actionTarget,
          data,
        });

        if (error) {
          setStatus(`Save failed: ${error.message}`);
          return;
        }
        setStatus("Saved.");
        await fetchTable(actionTarget);
      } catch (err) {
        setStatus(err instanceof Error ? `Save failed: ${err.message}` : "Save failed.");
      }
      return;
    }
    setStatus(`"${does}" isn't implemented yet.`);
  }

  return (
    <div className="flex flex-col gap-4">
      {status && (
        <div className="rounded-md bg-black/5 px-3 py-2 text-sm dark:bg-white/10">{status}</div>
      )}

      {schema.blocks.map((block) => {
        switch (block.type) {
          case "input":
            return (
              <label key={block.id} className="flex flex-col gap-1 text-sm">
                <span className="font-medium">{block.label}</span>
                {block.kind === "boolean" ? (
                  <input
                    type="checkbox"
                    checked={Boolean(draft[block.id])}
                    onChange={(e) => setDraft((d) => ({ ...d, [block.id]: e.target.checked }))}
                    className="h-5 w-5"
                  />
                ) : block.kind === "number" ? (
                  <input
                    type="number"
                    value={(draft[block.id] as number) ?? ""}
                    onChange={(e) => setDraft((d) => ({ ...d, [block.id]: Number(e.target.value) }))}
                    className="rounded-md border border-black/15 px-3 py-2 dark:border-white/20 dark:bg-transparent"
                  />
                ) : block.kind === "date" ? (
                  <input
                    type="date"
                    value={(draft[block.id] as string) ?? ""}
                    onChange={(e) => setDraft((d) => ({ ...d, [block.id]: e.target.value }))}
                    className="rounded-md border border-black/15 px-3 py-2 dark:border-white/20 dark:bg-transparent"
                  />
                ) : (
                  <input
                    type="text"
                    value={(draft[block.id] as string) ?? ""}
                    onChange={(e) => setDraft((d) => ({ ...d, [block.id]: e.target.value }))}
                    className="rounded-md border border-black/15 px-3 py-2 dark:border-white/20 dark:bg-transparent"
                  />
                )}
              </label>
            );

          case "table":
            // Table blocks declare storage; they render nothing themselves.
            return null;

          case "view": {
            const rows = rowsByTable[block.source] ?? [];
            return <ViewBlockRenderer key={block.id} block={block} rows={rows} />;
          }

          case "action":
            return (
              <button
                key={block.id}
                onClick={() => handleAction(block.target, block.does)}
                className="w-fit rounded-md bg-black px-4 py-2 text-sm font-medium text-white hover:bg-black/80 dark:bg-white dark:text-black dark:hover:bg-white/80"
              >
                {block.label ?? block.does.replace("_", " ")}
              </button>
            );

          case "rule":
            // Notifications need server-side infra (cron/push) that's out of
            // scope for the Phase 1 engine — shown as a passive note for now.
            return (
              <p key={block.id} className="text-xs text-black/50 dark:text-white/50">
                Rule (not yet enforced): when <em>{block.when}</em>, then <em>{block.then}</em>.
              </p>
            );
        }
      })}
    </div>
  );
}
