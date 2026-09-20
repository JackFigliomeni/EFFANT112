"use client";

import { Suspense, useEffect, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import { createClient } from "@/lib/supabase/client";
import {
  BLOCK_TYPES,
  VISIBILITIES,
  emptyBlock,
  validateToolSchema,
  type Block,
  type BlockType,
  type ToolSchema,
  type Visibility,
} from "@/lib/schema";
import { BlockEditor } from "@/components/builder/BlockEditor";
import { ToolRenderer } from "@/components/renderer/ToolRenderer";
import { AccentPicker } from "@/components/AccentPicker";
import { ShareMenu } from "@/components/ShareMenu";
import { Button } from "@/components/ui/button";
import { BUILDER_PREFILL_KEY } from "@/lib/builderPrefill";
import { isPlan, type Plan } from "@/lib/plans";
import { DEFAULT_THEME_COLOR, accentOf, isMissingColumn } from "@/lib/toolColumns";

// Depends on runtime env vars and a user's own session — never prerender it
// statically at build time.
export const dynamic = "force-dynamic";

const VISIBILITY_HINT: Record<Visibility, string> = {
  private: "Only you.",
  workspace: "Everyone in your workspace.",
  public: "Anyone with the link, and listed on Community.",
};

function BuilderPageInner() {
  const supabase = createClient();
  const router = useRouter();
  const searchParams = useSearchParams();
  const editingId = searchParams.get("id");

  const [toolId, setToolId] = useState<string | null>(editingId);
  const [name, setName] = useState("Untitled tool");
  const [description, setDescription] = useState("");
  const [blocks, setBlocks] = useState<Block[]>([]);
  const [selected, setSelected] = useState<number | null>(null);
  const [visibility, setVisibility] = useState<Visibility>("private");
  const [themeColor, setThemeColor] = useState(DEFAULT_THEME_COLOR);
  const [tab, setTab] = useState<"preview" | "design">("preview");
  const [status, setStatus] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [confirmingDelete, setConfirmingDelete] = useState(false);
  const [deleting, setDeleting] = useState(false);
  // Who's creating this tool and which workspace it belongs to, so every
  // insert gets tagged automatically. `plan` only drives the automation
  // test-run copy in the part editor.
  const [owner, setOwner] = useState<{ userId: string; workspaceId: string | null; plan: Plan } | null>(null);

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
        // Not signed in / can't reach Supabase yet — owner stays null and the
        // tool saves without an owner (see 0001_create_tools.sql).
      }
    }
    loadOwner();
  }, [supabase]);

  // Load: an existing tool (edit mode), a tool handed over by the Generator,
  // or a blank slate.
  useEffect(() => {
    async function load() {
      if (editingId) {
        try {
          let result = await supabase
            .from("tools")
            .select("id, name, schema, visibility, theme_color, description")
            .eq("id", editingId)
            .single();
          if (isMissingColumn(result.error)) {
            result = (await supabase
              .from("tools")
              .select("id, name, schema, visibility")
              .eq("id", editingId)
              .single()) as typeof result;
          }
          const { data, error } = result;
          if (error || !data) {
            setStatus(`Couldn't load tool: ${error?.message ?? "not found"}`);
            return;
          }
          setName(data.name);
          const loaded = (data.schema as ToolSchema).blocks;
          setBlocks(loaded);
          setSelected(loaded.length > 0 ? 0 : null);
          setVisibility(data.visibility);
          setThemeColor(data.theme_color ?? DEFAULT_THEME_COLOR);
          setDescription(data.description ?? "");
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
            setSelected(0);
            if (typeof prefill.themeColor === "string") setThemeColor(prefill.themeColor);
          }
        } catch {
          // fall through to a blank slate
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
    setSelected(blocks.length);
  }

  function updateBlock(index: number, next: Block) {
    setBlocks((prev) => prev.map((b, i) => (i === index ? next : b)));
  }

  function removeBlock(index: number) {
    setBlocks((prev) => prev.filter((_, i) => i !== index));
    setSelected((cur) => (cur === null ? null : cur >= index ? Math.max(0, cur - 1) : cur));
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

    const core = { name, schema, visibility };
    const extras = { theme_color: themeColor, description };
    const NEEDS_MIGRATION = " Color and description will save once migrations 0015 and 0016 are applied.";

    try {
      if (toolId) {
        // .select().single() matters: an update that matches zero rows (e.g.
        // RLS silently blocking a non-owner) otherwise returns no error and no
        // data — without checking `data` this would report "Saved." for nothing.
        let result = await supabase.from("tools").update({ ...core, ...extras }).eq("id", toolId).select("id").single();
        let degraded = false;
        if (isMissingColumn(result.error)) {
          degraded = true;
          result = (await supabase.from("tools").update(core).eq("id", toolId).select("id").single()) as typeof result;
        }
        const { data, error } = result;
        if (error || !data) {
          setStatus(
            error?.code === "PGRST116"
              ? "You don't have permission to edit this tool."
              : `Save failed: ${error?.message ?? "unknown error"}`,
          );
        } else {
          setStatus(degraded ? `Saved.${NEEDS_MIGRATION}` : "Saved.");
        }
      } else {
        const base = { ...core, owner_id: owner?.userId ?? null, workspace_id: owner?.workspaceId ?? null };
        let result = await supabase.from("tools").insert({ ...base, ...extras }).select("id").single();
        let degraded = false;
        if (isMissingColumn(result.error)) {
          degraded = true;
          result = (await supabase.from("tools").insert(base).select("id").single()) as typeof result;
        }
        const { data, error } = result;
        if (error || !data) {
          setStatus(`Save failed: ${error?.message ?? "unknown error"}`);
        } else {
          setStatus(degraded ? `Created.${NEEDS_MIGRATION}` : "Created.");
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
  const selectedBlock = selected !== null ? blocks[selected] : undefined;

  return (
    <section className="workspace builder-workspace">
      {/* left: the tool's name and its parts */}
      <aside className="workspace-rail">
        <span className="font-mono text-[9px] uppercase text-muted-foreground">Builder space</span>
        <input
          className="mt-4 w-full border-b border-border bg-transparent pb-2 text-lg font-semibold outline-none focus:border-foreground"
          value={name}
          onChange={(e) => setName(e.target.value)}
          aria-label="Tool name"
        />
        <p className="mt-3 text-xs text-muted-foreground">
          {blocks.length} {blocks.length === 1 ? "part" : "parts"}
        </p>

        <div className="mt-8 space-y-2">
          {blocks.map((block, i) => (
            <button
              key={i}
              onClick={() => setSelected(i)}
              className={`part-tab animate-fitted-part ${selected === i ? "is-selected" : ""}`}
            >
              <span className="truncate font-medium">{block.id || "untitled"}</span>
              <span className="font-mono text-[9px] uppercase text-muted-foreground">{block.type}</span>
            </button>
          ))}
        </div>

        <div className="mt-6">
          <p className="control-kicker">Add a part</p>
          <div className="mt-3 flex flex-wrap gap-1.5">
            {BLOCK_TYPES.map((type) => (
              <Button key={type} variant="glass" size="sm" onClick={() => addBlock(type)}>
                + {type}
              </Button>
            ))}
          </div>
        </div>
      </aside>

      {/* center: what you're making, working, plus how it looks */}
      <section className="workspace-canvas">
        <div className="canvas-grid" aria-hidden="true" />
        <div className="canvas-toolbar">
          <div className="privacy-switch">
            <Button variant={tab === "preview" ? "ink" : "quiet"} size="sm" onClick={() => setTab("preview")}>
              Preview
            </Button>
            <Button variant={tab === "design" ? "ink" : "quiet"} size="sm" onClick={() => setTab("design")}>
              Design
            </Button>
          </div>
          <span className="font-mono text-[9px] uppercase text-muted-foreground">
            {toolId ? "Saved tool" : "Not saved yet"} · edits appear instantly
          </span>
        </div>

        <div className="canvas-body">
          {tab === "preview" ? (
            previewValid ? (
              <div className="mx-auto max-w-xl">
                <ToolRenderer schema={previewSchema} toolId={toolId} themeColor={accentOf(themeColor)} />
              </div>
            ) : (
              <div className="grid min-h-[20rem] place-items-center text-center">
                <p className="max-w-[28ch] text-sm leading-relaxed text-muted-foreground">
                  {blocks.length === 0
                    ? "Add a part on the left and it appears here, working."
                    : "Finish filling in the highlighted part and the preview comes back."}
                </p>
              </div>
            )
          ) : (
            <div className="animate-reveal mx-auto max-w-md space-y-8">
              <div>
                <p className="control-kicker">Accent color</p>
                <div className="mt-4">
                  <AccentPicker value={themeColor} onChange={setThemeColor} />
                </div>
                <p className="mt-3 text-xs leading-relaxed text-muted-foreground">
                  Used for this tool&rsquo;s buttons, marked calendar days, chart bars, and its own app icon
                  when installed.
                </p>
              </div>
              <label className="block">
                <span className="control-kicker">Description</span>
                <textarea
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  rows={3}
                  maxLength={280}
                  placeholder="One or two sentences on what this is for. Shown on the Community page."
                  className="mt-3 w-full resize-none border-b border-border bg-transparent pb-2 text-sm leading-relaxed outline-none focus:border-foreground"
                />
              </label>
            </div>
          )}
        </div>
      </section>

      {/* right: edit the selected part, then release */}
      <aside className="workspace-test">
        <span className="font-mono text-[9px] uppercase text-muted-foreground">
          {selectedBlock ? "Edit part" : "Edit & release"}
        </span>
        <div className="mt-6">
          {selectedBlock && selected !== null ? (
            <BlockEditor
              key={selected}
              block={selectedBlock}
              onChange={(next) => updateBlock(selected, next)}
              onRemove={() => removeBlock(selected)}
              toolId={toolId}
              plan={owner?.plan ?? "free"}
            />
          ) : (
            <p className="text-xs leading-relaxed text-muted-foreground">Pick a part on the left to edit it.</p>
          )}
        </div>

        <div className="mt-10">
          <p className="control-kicker">Who can see it</p>
          <div className="privacy-switch mt-3">
            {VISIBILITIES.map((v) => (
              <Button
                key={v}
                size="sm"
                variant={visibility === v ? (v === "public" ? "signal" : "ink") : "quiet"}
                onClick={() => setVisibility(v)}
                className="capitalize"
              >
                {v}
              </Button>
            ))}
          </div>
          <p className="mt-3 text-xs text-muted-foreground">
            {VISIBILITY_HINT[visibility]}
            {!owner && " Sign in for this to apply to anyone else."}
          </p>
        </div>

        <div className="mt-auto pt-8">
          <div className="grid grid-cols-[1fr_auto] gap-2">
            <Button variant="signal" onClick={save} disabled={saving || blocks.length === 0}>
              {saving ? "Saving…" : toolId ? "Save changes" : "Create tool"}
            </Button>
            {toolId && <ShareMenu url={`/tools/${toolId}`} title={name} />}
          </div>

          {toolId && (
            <div className="mt-4 flex items-center gap-3 text-xs">
              <Link href={`/tools/${toolId}`} className="text-muted-foreground underline hover:text-foreground">
                Open tool
              </Link>
              {!confirmingDelete ? (
                <button onClick={() => setConfirmingDelete(true)} className="text-destructive underline">
                  Delete
                </button>
              ) : (
                <span className="flex items-center gap-2">
                  Delete it and all its data?
                  <button onClick={deleteTool} disabled={deleting} className="font-medium text-destructive underline disabled:opacity-50">
                    {deleting ? "Deleting…" : "Yes"}
                  </button>
                  <button onClick={() => setConfirmingDelete(false)} className="text-muted-foreground underline">
                    No
                  </button>
                </span>
              )}
            </div>
          )}

          {status && (
            <p className="mt-4 border-l-2 border-signal pl-3 text-xs leading-relaxed text-muted-foreground">
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
      </aside>
    </section>
  );
}

export default function BuilderPage() {
  return (
    <Suspense>
      <BuilderPageInner />
    </Suspense>
  );
}
