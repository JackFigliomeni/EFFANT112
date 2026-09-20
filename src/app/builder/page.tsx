"use client";

import { Suspense, useEffect, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import { createClient } from "@/lib/supabase/client";
import {
  BLOCK_TYPES,
  emptyBlock,
  validateToolSchema,
  type Block,
  type BlockType,
  type ToolSchema,
} from "@/lib/schema";
import { BlockEditor } from "@/components/builder/BlockEditor";
import { ToolRenderer } from "@/components/renderer/ToolRenderer";
import { isPlan, type Plan } from "@/lib/plans";
import { isMissingColumn } from "@/lib/toolColumns";

/** sessionStorage key Phase 3's prompt-to-schema page uses to hand off a
 * freshly generated schema for editing here. */
export const BUILDER_PREFILL_KEY = "effant:builder-prefill";

// Depends on runtime env vars and a user's own session — never prerender it
// statically at build time.
export const dynamic = "force-dynamic";

function BuilderPageInner() {
  const supabase = createClient();
  const router = useRouter();
  const searchParams = useSearchParams();
  const editingId = searchParams.get("id");

  const [toolId, setToolId] = useState<string | null>(editingId);
  const [name, setName] = useState("Untitled tool");
  const [blocks, setBlocks] = useState<Block[]>([]);
  const [visibility, setVisibility] = useState<"private" | "workspace" | "public">("private");
  const [themeColor, setThemeColor] = useState("#171717");
  const [tab, setTab] = useState<"blocks" | "design">("blocks");
  const [status, setStatus] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [confirmingDelete, setConfirmingDelete] = useState(false);
  const [deleting, setDeleting] = useState(false);
  // Phase 4 tagging: who's creating this tool and which workspace it belongs
  // to, so every insert gets tagged automatically. Both stay null pre-auth.
  // `plan` is used only to show the right automation test-run copy/limits
  // in the automation block editor below.
  const [owner, setOwner] = useState<{ userId: string; workspaceId: string | null; plan: Plan } | null>(
    null,
  );

  useEffect(() => {
    async function loadOwner() {
      try {
        const {
          data: { user },
        } = await supabase.auth.getUser();
        if (!user) return;
        const { data: profile } = await supabase
          .from("profiles")
          .select("workspace_id, plan")
          .eq("id", user.id)
          .maybeSingle();
        setOwner({
          userId: user.id,
          workspaceId: profile?.workspace_id ?? null,
          plan: isPlan(profile?.plan) ? profile.plan : "free",
        });
      } catch {
        // Not signed in / can't reach Supabase yet — fine, owner just stays
        // null and the tool saves without an owner (see 0001_create_tools.sql).
      }
    }
    loadOwner();
  }, [supabase]);

  // Load: either an existing tool (edit mode), a Phase 3 prefill handed off
  // via sessionStorage, or a blank slate.
  useEffect(() => {
    async function load() {
      if (editingId) {
        try {
          let { data, error } = await supabase
            .from("tools")
            .select("id, name, schema, visibility, theme_color")
            .eq("id", editingId)
            .single();
          if (isMissingColumn(error)) {
            ({ data, error } = await supabase
              .from("tools")
              .select("id, name, schema, visibility")
              .eq("id", editingId)
              .single());
          }
          if (error || !data) {
            setStatus(`Couldn't load tool: ${error?.message ?? "not found"}`);
            return;
          }
          setName(data.name);
          setBlocks((data.schema as ToolSchema).blocks);
          setVisibility(data.visibility);
          setThemeColor(data.theme_color ?? "#171717");
        } catch (err) {
          setStatus(err instanceof Error ? `Couldn't load tool: ${err.message}` : "Couldn't load tool.");
        }
        return;
      }

      const prefillRaw = sessionStorage.getItem(BUILDER_PREFILL_KEY);
      if (prefillRaw) {
        sessionStorage.removeItem(BUILDER_PREFILL_KEY);
        try {
          const prefill = JSON.parse(prefillRaw);
          const result = validateToolSchema(prefill.schema);
          if (result.ok) {
            setName(prefill.name ?? "Generated tool");
            setBlocks(result.schema.blocks);
            return;
          }
        } catch {
          // fall through to blank slate
        }
      }
    }
    load();
    // Only re-run if the id in the URL changes.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [editingId]);

  function addBlock(type: BlockType) {
    const id = `${type}_${blocks.filter((b) => b.type === type).length + 1}`;
    setBlocks((prev) => [...prev, emptyBlock(type, id)]);
  }

  function updateBlock(index: number, next: Block) {
    setBlocks((prev) => prev.map((b, i) => (i === index ? next : b)));
  }

  function removeBlock(index: number) {
    setBlocks((prev) => prev.filter((_, i) => i !== index));
  }

  async function save() {
    setSaving(true);
    setStatus(null);
    const schema: ToolSchema = { blocks };
    const validation = validateToolSchema(schema);
    if (!validation.ok) {
      setStatus(`Schema invalid: ${validation.error}`);
      setSaving(false);
      return;
    }

    try {
      if (toolId) {
        // .select().single() matters here: an update that matches zero rows
        // (e.g. RLS silently blocking a non-owner's edit of a public tool)
        // otherwise returns no error and no data — without checking `data`,
        // this would report "Saved." even though nothing changed.
        let { data, error } = await supabase
          .from("tools")
          .update({ name, schema, visibility, theme_color: themeColor })
          .eq("id", toolId)
          .select("id")
          .single();
        if (isMissingColumn(error)) {
          ({ data, error } = await supabase
            .from("tools")
            .update({ name, schema, visibility })
            .eq("id", toolId)
            .select("id")
            .single());
        }
        if (error || !data) {
          setStatus(
            error?.code === "PGRST116"
              ? "You don't have permission to edit this tool."
              : `Save failed: ${error?.message ?? "unknown error"}`,
          );
        } else {
          setStatus("Saved.");
        }
      } else {
        const base = {
          name,
          schema,
          visibility,
          owner_id: owner?.userId ?? null,
          workspace_id: owner?.workspaceId ?? null,
        };
        let { data, error } = await supabase
          .from("tools")
          .insert({ ...base, theme_color: themeColor })
          .select("id")
          .single();
        if (isMissingColumn(error)) {
          ({ data, error } = await supabase.from("tools").insert(base).select("id").single());
        }
        if (error || !data) {
          setStatus(`Save failed: ${error?.message ?? "unknown error"}`);
        } else {
          setStatus("Created.");
          setToolId(data.id);
          router.replace(`/builder?id=${data.id}`);
        }
      }
    } catch (err) {
      // A rejected fetch throws instead of returning {error} — without this
      // the Save button would stay stuck on "Saving…" forever.
      setStatus(err instanceof Error ? `Save failed: ${err.message}` : "Save failed.");
    } finally {
      setSaving(false);
    }
  }

  async function deleteTool() {
    if (!toolId) return;
    setDeleting(true);
    try {
      const { error } = await supabase.from("tools").delete().eq("id", toolId);
      if (error) {
        setStatus(`Delete failed: ${error.message}`);
        setDeleting(false);
        return;
      }
      router.push("/gallery");
    } catch (err) {
      setStatus(err instanceof Error ? `Delete failed: ${err.message}` : "Delete failed.");
      setDeleting(false);
    }
  }

  const previewSchema: ToolSchema = { blocks };
  const previewValid = blocks.length > 0 && validateToolSchema(previewSchema).ok;

  return (
    <div className="mx-auto grid max-w-5xl grid-cols-1 gap-6 p-6 md:grid-cols-2">
      <div className="flex flex-col gap-4">
        <div>
          <h1 className="text-xl font-semibold">Builder</h1>
          <p className="text-sm text-black/60 dark:text-white/60">
            Add/edit/remove blocks by hand — no prompting needed.
          </p>
        </div>

        <label className="flex flex-col gap-1 text-sm">
          Tool name
          <input
            className="rounded-md border border-black/15 px-3 py-2 dark:border-white/20 dark:bg-transparent"
            value={name}
            onChange={(e) => setName(e.target.value)}
          />
        </label>

        <div className="flex w-fit rounded-full border border-black/15 p-0.5 text-sm dark:border-white/20">
          {(["blocks", "design"] as const).map((t) => (
            <button
              key={t}
              onClick={() => setTab(t)}
              className={`rounded-full px-3 py-1 capitalize transition ${
                tab === t
                  ? "bg-black text-white dark:bg-white dark:text-black"
                  : "text-black/60 hover:text-black dark:text-white/60 dark:hover:text-white"
              }`}
            >
              {t}
            </button>
          ))}
        </div>

        {tab === "design" && (
          <div className="flex flex-col gap-2 text-sm">
            <span>Accent color</span>
            <div className="flex flex-wrap items-center gap-2">
              {["#171717", "#ef4444", "#f97316", "#eab308", "#22c55e", "#06b6d4", "#3b82f6", "#8b5cf6", "#ec4899"].map(
                (c) => (
                  <button
                    key={c}
                    type="button"
                    aria-label={c}
                    onClick={() => setThemeColor(c)}
                    className={`h-8 w-8 rounded-full transition ${
                      themeColor === c ? "ring-2 ring-offset-2 ring-black dark:ring-white dark:ring-offset-black" : ""
                    }`}
                    style={{ backgroundColor: c }}
                  />
                ),
              )}
              <input
                type="color"
                value={themeColor}
                onChange={(e) => setThemeColor(e.target.value)}
                className="h-8 w-8 cursor-pointer rounded-full border-0 bg-transparent p-0"
                aria-label="Custom accent color"
              />
            </div>
            <p className="text-xs text-black/40 dark:text-white/40">
              Used for this tool&rsquo;s buttons, marked calendar days, and chart bars — plus its
              generated home-screen icon if installed.
            </p>
          </div>
        )}

        {tab === "blocks" && (
        <>
        <fieldset className="flex flex-col gap-1 text-sm">
          <legend className="mb-1">Visibility</legend>
          <div className="flex gap-4">
            {(["private", "workspace", "public"] as const).map((v) => (
              <label key={v} className="flex items-center gap-1.5">
                <input
                  type="radio"
                  name="visibility"
                  checked={visibility === v}
                  onChange={() => setVisibility(v)}
                />
                {v}
              </label>
            ))}
          </div>
          {!owner && (
            <p className="text-xs text-black/50 dark:text-white/50">
              Sign in for &ldquo;workspace&rdquo; visibility to actually be shared with anyone.
            </p>
          )}
          {visibility === "public" && (
            <p className="text-xs text-amber-600">
              Visible to anyone on the internet, even without an account — it&rsquo;ll show up on
              the <Link href="/community" className="underline">Community</Link> page. Only you
              can still edit it or add records.
            </p>
          )}
        </fieldset>

        <div className="flex flex-col gap-2">
          {blocks.map((block, i) => (
            <BlockEditor
              key={i}
              block={block}
              onChange={(next) => updateBlock(i, next)}
              onRemove={() => removeBlock(i)}
              toolId={toolId}
              plan={owner?.plan ?? "free"}
            />
          ))}
        </div>

        <div className="flex flex-wrap gap-2">
          {BLOCK_TYPES.map((type) => (
            <button
              key={type}
              onClick={() => addBlock(type)}
              className="rounded-md border border-black/15 px-3 py-1.5 text-sm hover:bg-black/5 dark:border-white/20 dark:hover:bg-white/10"
            >
              + {type}
            </button>
          ))}
        </div>
        </>
        )}

        <div className="flex items-center gap-3">
          <button
            onClick={save}
            disabled={saving || blocks.length === 0}
            className="w-fit rounded-md bg-black px-4 py-2 text-sm font-medium text-white hover:bg-black/80 disabled:opacity-50 dark:bg-white dark:text-black"
          >
            {saving ? "Saving…" : toolId ? "Save changes" : "Create tool"}
          </button>

          {toolId && !confirmingDelete && (
            <button
              onClick={() => setConfirmingDelete(true)}
              className="text-sm text-red-600 underline hover:text-red-700"
            >
              Delete tool
            </button>
          )}
          {toolId && confirmingDelete && (
            <span className="flex items-center gap-2 text-sm">
              Delete this tool and all its data?
              <button
                onClick={deleteTool}
                disabled={deleting}
                className="font-medium text-red-600 underline hover:text-red-700 disabled:opacity-50"
              >
                {deleting ? "Deleting…" : "Yes, delete"}
              </button>
              <button
                onClick={() => setConfirmingDelete(false)}
                className="text-black/50 underline dark:text-white/50"
              >
                Cancel
              </button>
            </span>
          )}
        </div>

        {status && (
          <p className="text-sm">
            {status}
            {status.includes("upgrade to Pro") && (
              <>
                {" "}
                <Link href="/pricing" className="underline">
                  See plans
                </Link>
                .
              </>
            )}
          </p>
        )}
      </div>

      <div className="flex flex-col gap-2">
        <h2 className="text-sm font-semibold text-black/60 dark:text-white/60">Live preview</h2>
        {previewValid && toolId ? (
          <ToolRenderer schema={previewSchema} toolId={toolId} themeColor={themeColor} />
        ) : (
          <p className="rounded-lg border border-dashed border-black/15 p-4 text-sm text-black/50 dark:border-white/20 dark:text-white/50">
            {blocks.length === 0
              ? "Add a block to see a preview."
              : "Save once to get a persisted preview (actions need a saved tool id)."}
          </p>
        )}
      </div>
    </div>
  );
}

export default function BuilderPage() {
  return (
    <Suspense>
      <BuilderPageInner />
    </Suspense>
  );
}
