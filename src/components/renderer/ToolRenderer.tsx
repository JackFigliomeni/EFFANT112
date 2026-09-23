"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import type { ToolSchema, TableBlock, ActionBlock, AppBlock } from "@/lib/schema";
import { ViewBlockRenderer } from "./blocks/ViewBlockRenderer";
import { InputBlockRenderer } from "./blocks/InputBlockRenderer";
import { AppFrame } from "@/components/AppFrame";

type Row = { id: string; data: Record<string, unknown>; created_at: string };

/**
 * The engine: given a tool's `schema` (input/table/view/action/rule blocks)
 * and the row id of that tool in the `tools` table, renders a fully working
 * interactive page — inputs write to a draft, actions persist that draft
 * (or edit/delete an existing record) to Supabase, and views read straight
 * back out of it.
 */
export function ToolRenderer({
  schema,
  toolId,
  themeColor,
  name = "App",
  frameClassName = "h-[70vh] min-h-[28rem] rounded-[20px] border border-border shadow-soft",
  previewKey,
}: {
  schema: ToolSchema;
  // null = not saved yet: everything works, but records live in memory only
  // (that's how Generator and Builder preview a tool before it exists).
  toolId: string | null;
  // Set in the Builder's Design tab (tools.theme_color) — the tool's own
  // accent, so an installed tool doesn't just inherit the site's black/white.
  themeColor?: string;
  // Only used when the tool is a generated app (see AppFrame).
  name?: string;
  frameClassName?: string;
  previewKey?: string;
}) {
  const supabase = createClient();
  const [draft, setDraft] = useState<Record<string, unknown>>({});
  const [rowsByTable, setRowsByTable] = useState<Record<string, Row[]>>({});
  const [status, setStatus] = useState<string | null>(null);
  // Each signed-in person keeps their own rows in a shared tool (see
  // tool_records_own_all in migration 0019) — a public tool is something
  // anyone can use, not a window into the owner's personal data.
  const userIdRef = useRef<string | null>(null);

  const tableBlocks = schema.blocks.filter((b): b is TableBlock => b.type === "table");
  const actionBlocks = schema.blocks.filter((b): b is ActionBlock => b.type === "action");

  const fetchTable = useCallback(
    async (tableId: string) => {
      if (!toolId) return;
      try {
        if (!userIdRef.current) {
          const {
            data: { user },
          } = await supabase.auth.getUser();
          userIdRef.current = user?.id ?? null;
        }
        if (!userIdRef.current) {
          setRowsByTable((prev) => ({ ...prev, [tableId]: [] }));
          return;
        }
        const { data, error } = await supabase
          .from("tool_records")
          .select("id, data, created_at")
          .eq("tool_id", toolId)
          .eq("table_id", tableId)
          .eq("user_id", userIdRef.current)
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
    if (!toolId) return;
    for (const table of tableBlocks) {
      fetchTable(table.id);
    }
    // Table block ids are static for a given schema — fine to run once per schema/tool.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [toolId]);

  async function handleAddRecord(tableId: string) {
    setStatus(null);
    const table = tableBlocks.find((t) => t.id === tableId);
    const data = table
      ? Object.fromEntries(table.fields.map((f) => [f, draft[f] ?? null]))
      : draft;

    if (!toolId) {
      const row: Row = { id: crypto.randomUUID(), data, created_at: new Date().toISOString() };
      setRowsByTable((prev) => ({ ...prev, [tableId]: [row, ...(prev[tableId] ?? [])] }));
      setStatus("Added to the preview (not saved anywhere yet).");
      return;
    }

    if (!userIdRef.current) {
      setStatus("Sign in to save your own data here.");
      return;
    }

    try {
      const { error } = await supabase.from("tool_records").insert({
        tool_id: toolId,
        table_id: tableId,
        user_id: userIdRef.current,
        data,
      });
      if (error) {
        setStatus(`Save failed: ${error.message}`);
        return;
      }
      setStatus("Saved.");
      await fetchTable(tableId);
    } catch (err) {
      setStatus(err instanceof Error ? `Save failed: ${err.message}` : "Save failed.");
    }
  }

  async function handleDeleteRecord(recordId: string, tableId: string) {
    setStatus(null);
    if (!toolId) {
      setRowsByTable((prev) => ({ ...prev, [tableId]: (prev[tableId] ?? []).filter((r) => r.id !== recordId) }));
      return;
    }
    try {
      const { error } = await supabase.from("tool_records").delete().eq("id", recordId);
      if (error) {
        setStatus(`Delete failed: ${error.message}`);
        return;
      }
      setStatus("Deleted.");
      await fetchTable(tableId);
    } catch (err) {
      setStatus(err instanceof Error ? `Delete failed: ${err.message}` : "Delete failed.");
    }
  }

  async function handleToggleField(recordId: string, tableId: string, field: string) {
    setStatus(null);
    const row = (rowsByTable[tableId] ?? []).find((r) => r.id === recordId);
    if (!row) return;
    const updatedData = { ...row.data, [field]: !row.data[field] };

    if (!toolId) {
      setRowsByTable((prev) => ({
        ...prev,
        [tableId]: (prev[tableId] ?? []).map((r) => (r.id === recordId ? { ...r, data: updatedData } : r)),
      }));
      return;
    }

    try {
      const { error } = await supabase.from("tool_records").update({ data: updatedData }).eq("id", recordId);
      if (error) {
        setStatus(`Update failed: ${error.message}`);
        return;
      }
      setStatus("Updated.");
      await fetchTable(tableId);
    } catch (err) {
      setStatus(err instanceof Error ? `Update failed: ${err.message}` : "Update failed.");
    }
  }

  const appBlock = schema.blocks.find((b): b is AppBlock => b.type === "app");
  if (appBlock) {
    return (
      <AppFrame
        html={appBlock.html}
        toolId={toolId}
        accent={themeColor}
        title={name}
        storageKey={previewKey}
        className={frameClassName}
      />
    );
  }

  return (
    <div className="flex flex-col gap-4">
      {status && (
        <div className="rounded-full border border-border bg-card/70 px-4 py-2 text-xs text-muted-foreground">{status}</div>
      )}

      {schema.blocks.map((block) => {
        switch (block.type) {
          case "input":
            return (
              <label key={block.id} className="flex flex-col gap-1 text-sm">
                <span className="font-medium">{block.label}</span>
                <InputBlockRenderer
                  block={block}
                  value={draft[block.id]}
                  onChange={(v) => setDraft((d) => ({ ...d, [block.id]: v }))}
                />
              </label>
            );

          case "table":
            // Table blocks declare storage; they render nothing themselves.
            return null;

          case "view": {
            const rows = rowsByTable[block.source] ?? [];
            // update_record/delete_record actions targeting this view's
            // table render as per-row buttons instead of a floating one —
            // a "delete this row" button needs a row to act on.
            const deleteAction = actionBlocks.find(
              (a) => a.does === "delete_record" && a.target === block.source,
            );
            const updateAction = actionBlocks.find(
              (a) => a.does === "update_record" && a.target === block.source,
            );
            return (
              <ViewBlockRenderer
                key={block.id}
                block={block}
                rows={rows}
                onDelete={deleteAction ? (id) => handleDeleteRecord(id, block.source) : undefined}
                onToggle={
                  updateAction
                    ? (id) => handleToggleField(id, block.source, updateAction.field!)
                    : undefined
                }
                toggleField={updateAction?.field}
                themeColor={themeColor}
              />
            );
          }

          case "action":
            // Only add_record makes sense as a standalone button — the
            // others need a specific row and render inline in the view instead.
            if (block.does !== "add_record") return null;
            return (
              <button
                key={block.id}
                onClick={() => handleAddRecord(block.target)}
                className="w-fit rounded-md px-4 py-2 text-sm font-medium text-white transition hover:opacity-90"
                style={{ backgroundColor: themeColor ?? "var(--foreground)" }}
              >
                {block.label ?? "add record"}
              </button>
            );

          case "rule":
            // Notifications need server-side infra (cron/push) that's out of
            // scope for the engine — shown as a passive note for now.
            return (
              <p key={block.id} className="text-xs text-muted-foreground">
                Rule (not yet enforced): when <em>{block.when}</em>, then <em>{block.then}</em>.
              </p>
            );

          case "app":
            // Handled above: an app is the whole tool, never one part of it.
            return null;

          case "automation":
            // Actually runs — see src/app/api/cron/automations/route.ts,
            // triggered once a day by Vercel Cron. Nothing to render here
            // beyond a note; the new record just shows up in whichever view
            // reads from `target`.
            return (
              <p key={block.id} className="text-xs text-muted-foreground">
                Automation: runs daily, adds a new record to <em>{block.target}</em> generated from
                &ldquo;{block.prompt}&rdquo;{block.useWebSearch ? " (with web search)" : ""}.
              </p>
            );
        }
      })}
    </div>
  );
}
