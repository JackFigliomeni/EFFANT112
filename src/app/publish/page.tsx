"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { createClient } from "@/lib/supabase/client";
import { ShareMenu } from "@/components/ShareMenu";
import { ToolRenderer } from "@/components/renderer/ToolRenderer";
import { Button, ButtonLink } from "@/components/ui/button";
import { VISIBILITIES, validateToolSchema, type Visibility } from "@/lib/schema";
import { DEFAULT_THEME_COLOR, accentOf, isMissingColumn } from "@/lib/toolColumns";

export const dynamic = "force-dynamic";

type OwnedTool = {
  id: string;
  name: string;
  schema: unknown;
  visibility: Visibility;
  theme_color: string | null;
};

const VISIBILITY_COPY: Record<Visibility, string> = {
  private: "Only you can see this.",
  workspace: "Everyone in your workspace can see this.",
  public: "Anyone with the link can see this, and it's listed on Community.",
};

/**
 * Who can see each tool you've made, in one place: change its visibility,
 * grab a share link, and check how it looks — without opening every tool in
 * the builder one at a time.
 */
export default function PublishPage() {
  const supabase = createClient();
  const [tools, setTools] = useState<OwnedTool[] | null>(null);
  const [signedIn, setSignedIn] = useState<boolean | null>(null);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [notice, setNotice] = useState<string | null>(null);

  useEffect(() => {
    async function load() {
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user) {
        setSignedIn(false);
        return;
      }
      setSignedIn(true);
      let result = await supabase
        .from("tools")
        .select("id, name, schema, visibility, theme_color")
        .eq("owner_id", user.id)
        .order("created_at", { ascending: false });
      if (isMissingColumn(result.error)) {
        result = (await supabase
          .from("tools")
          .select("id, name, schema, visibility")
          .eq("owner_id", user.id)
          .order("created_at", { ascending: false })) as typeof result;
      }
      const { data, error } = result;
      if (error) {
        setLoadError(error.message);
        return;
      }
      const list = (data ?? []) as OwnedTool[];
      setTools(list);
      setSelectedId(list[0]?.id ?? null);
    }
    load();
  }, [supabase]);

  const selected = tools?.find((t) => t.id === selectedId) ?? null;
  const validation = selected ? validateToolSchema(selected.schema) : null;

  async function updateVisibility(visibility: Visibility) {
    if (!selected) return;
    const previous = selected.visibility;
    setSaving(true);
    setNotice(null);
    setTools((prev) => prev?.map((t) => (t.id === selected.id ? { ...t, visibility } : t)) ?? prev);
    const { error } = await supabase.from("tools").update({ visibility }).eq("id", selected.id);
    if (error) {
      setTools((prev) => prev?.map((t) => (t.id === selected.id ? { ...t, visibility: previous } : t)) ?? prev);
      setNotice(`Couldn't change that: ${error.message}`);
    } else {
      setNotice(visibility === "public" ? "Published. It's on the Community page now." : "Updated.");
    }
    setSaving(false);
  }

  if (signedIn === false) {
    return (
      <div className="mx-auto max-w-lg py-24 text-sm">
        <Link href="/login" className="underline">
          Sign in
        </Link>{" "}
        to manage what&rsquo;s published.
      </div>
    );
  }

  return (
    <section className="workspace builder-workspace">
      <aside className="workspace-rail">
        <span className="font-mono text-[9px] uppercase text-muted-foreground">Publish</span>
        <h1 className="mt-3 text-xl font-semibold">Who sees what.</h1>
        <p className="mt-3 text-xs leading-relaxed text-muted-foreground">
          Every tool you&rsquo;ve made, and who can open it.
        </p>

        <div className="mt-8 space-y-2">
          {tools === null ? (
            <p className="text-xs text-muted-foreground">{loadError ?? "Loading…"}</p>
          ) : tools.length === 0 ? (
            <p className="text-xs leading-relaxed text-muted-foreground">
              You haven&rsquo;t made a tool yet.{" "}
              <Link href="/generate" className="underline">
                Start one
              </Link>
              .
            </p>
          ) : (
            tools.map((tool) => (
              <button
                key={tool.id}
                onClick={() => {
                  setSelectedId(tool.id);
                  setNotice(null);
                }}
                className={`part-tab animate-fitted-part ${selectedId === tool.id ? "is-selected" : ""}`}
                style={{ borderLeftColor: tool.theme_color && tool.theme_color !== DEFAULT_THEME_COLOR ? tool.theme_color : undefined }}
              >
                <span className="truncate font-medium">{tool.name}</span>
                <span className="font-mono text-[9px] uppercase text-muted-foreground">{tool.visibility}</span>
              </button>
            ))
          )}
        </div>
      </aside>

      <section className="workspace-canvas">
        <div className="canvas-grid" aria-hidden="true" />
        <div className="canvas-toolbar">
          <span className="font-mono text-[9px] uppercase text-muted-foreground">Preview</span>
          {selected && <span className="text-xs text-muted-foreground">Live: anything you add here is saved.</span>}
        </div>
        <div className="canvas-body">
          {selected && validation?.ok ? (
            <div className="mx-auto max-w-xl">
              <h2 className="mb-6 text-2xl font-semibold">{selected.name}</h2>
              <ToolRenderer
                key={selected.id}
                schema={validation.schema}
                toolId={selected.id}
                themeColor={accentOf(selected.theme_color)}
              />
            </div>
          ) : (
            <div className="grid min-h-[20rem] place-items-center text-center">
              <p className="max-w-[28ch] text-sm leading-relaxed text-muted-foreground">
                {selected ? "This tool's saved schema is invalid, so it can't be previewed." : "Pick a tool on the left."}
              </p>
            </div>
          )}
        </div>
      </section>

      <aside className="workspace-test">
        <span className="font-mono text-[9px] uppercase text-muted-foreground">Release</span>
        {selected ? (
          <>
            <div className="mt-6">
              <p className="control-kicker">Who can see it</p>
              <div className="privacy-switch mt-3">
                {VISIBILITIES.map((v) => (
                  <Button
                    key={v}
                    size="sm"
                    variant={selected.visibility === v ? (v === "public" ? "signal" : "ink") : "quiet"}
                    onClick={() => updateVisibility(v)}
                    disabled={saving}
                    className="capitalize"
                  >
                    {v}
                  </Button>
                ))}
              </div>
              <p className="mt-3 text-xs leading-relaxed text-muted-foreground">{VISIBILITY_COPY[selected.visibility]}</p>
            </div>

            <div className="mt-8">
              <p className="control-kicker">Share</p>
              <div className="mt-3 flex items-center gap-2">
                <ShareMenu url={`/tools/${selected.id}`} title={selected.name} variant="ink" />
              </div>
              {selected.visibility === "private" && (
                <p className="mt-3 text-xs leading-relaxed text-muted-foreground">
                  It&rsquo;s private, so a shared link only works for you until you change that.
                </p>
              )}
            </div>

            <div className="mt-auto flex flex-col gap-3 pt-8">
              {notice && <p className="border-l-2 border-signal pl-3 text-xs leading-relaxed text-muted-foreground">{notice}</p>}
              <div className="flex gap-2">
                <ButtonLink href={`/tools/${selected.id}`} variant="glass" size="sm">
                  Open tool
                </ButtonLink>
                <ButtonLink href={`/builder?id=${selected.id}`} variant="quiet" size="sm">
                  Edit in Builder
                </ButtonLink>
              </div>
            </div>
          </>
        ) : (
          <p className="mt-6 text-xs text-muted-foreground">Nothing selected.</p>
        )}
      </aside>
    </section>
  );
}
