"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { createClient } from "@/lib/supabase/client";
import { ShareButton } from "@/components/ShareButton";
import type { Visibility } from "@/lib/schema";
import { isMissingColumn } from "@/lib/toolColumns";

export const dynamic = "force-dynamic";

type OwnedTool = {
  id: string;
  name: string;
  visibility: Visibility;
  theme_color: string | null;
};

const VISIBILITY_COPY: Record<Visibility, string> = {
  private: "Only you can see this.",
  workspace: "Visible to your workspace.",
  public: "Visible to anyone, listed on Community.",
};

/**
 * A dedicated home for "who can see this" — previously only a couple of
 * radio buttons buried in the Builder. Change a tool's visibility, grab a
 * share link, and preview it, all in one list instead of opening each tool
 * one at a time.
 */
export default function PublishPage() {
  const supabase = createClient();
  const [tools, setTools] = useState<OwnedTool[] | null>(null);
  const [signedIn, setSignedIn] = useState<boolean | null>(null);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [savingId, setSavingId] = useState<string | null>(null);
  const [expandedId, setExpandedId] = useState<string | null>(null);

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
        .select("id, name, visibility, theme_color")
        .eq("owner_id", user.id)
        .order("created_at", { ascending: false });
      if (isMissingColumn(result.error)) {
        result = (await supabase
          .from("tools")
          .select("id, name, visibility")
          .eq("owner_id", user.id)
          .order("created_at", { ascending: false })) as typeof result;
      }
      const { data, error } = result;
      if (error) {
        setLoadError(error.message);
        return;
      }
      setTools((data ?? []) as OwnedTool[]);
    }
    load();
  }, [supabase]);

  async function updateVisibility(toolId: string, visibility: Visibility) {
    setSavingId(toolId);
    setTools((prev) => prev?.map((t) => (t.id === toolId ? { ...t, visibility } : t)) ?? prev);
    await supabase.from("tools").update({ visibility }).eq("id", toolId);
    setSavingId(null);
  }

  if (signedIn === false) {
    return (
      <div className="mx-auto max-w-lg p-6 text-sm">
        <Link href="/login" className="underline">
          Sign in
        </Link>{" "}
        to manage what&rsquo;s published.
      </div>
    );
  }

  return (
    <div className="mx-auto flex max-w-2xl flex-col gap-6 p-6">
      <div>
        <h1 className="text-xl font-semibold">Publish</h1>
        <p className="text-sm text-black/60 dark:text-white/60">
          Decide who can see each tool you&rsquo;ve made, and share a link to it.
        </p>
      </div>

      {loadError && <p className="text-sm text-red-600">{loadError}</p>}

      {tools === null ? (
        loadError ? null : <p className="text-sm text-black/50 dark:text-white/50">Loading…</p>
      ) : tools.length === 0 ? (
        <p className="text-sm text-black/50 dark:text-white/50">
          You haven&rsquo;t made a tool yet —{" "}
          <Link href="/generate" className="underline">
            start one
          </Link>
          .
        </p>
      ) : (
        <div className="flex flex-col gap-3">
          {tools.map((tool) => (
            <div
              key={tool.id}
              className="flex flex-col gap-3 rounded-xl border border-black/10 p-4 dark:border-white/10"
            >
              <div className="flex flex-wrap items-center justify-between gap-3">
                <div className="flex items-center gap-2">
                  <span
                    className="h-2.5 w-2.5 rounded-full"
                    style={{ backgroundColor: tool.theme_color ?? "#171717" }}
                  />
                  <span className="font-medium">{tool.name}</span>
                </div>
                <div className="flex items-center gap-2">
                  <select
                    value={tool.visibility}
                    onChange={(e) => updateVisibility(tool.id, e.target.value as Visibility)}
                    disabled={savingId === tool.id}
                    className="rounded-md border border-black/15 bg-transparent px-2 py-1 text-sm dark:border-white/20"
                  >
                    <option value="private">Private</option>
                    <option value="workspace">Workspace</option>
                    <option value="public">Public</option>
                  </select>
                  <ShareButton url={`/tools/${tool.id}`} title={tool.name} />
                  <button
                    onClick={() => setExpandedId(expandedId === tool.id ? null : tool.id)}
                    className="text-sm underline"
                  >
                    {expandedId === tool.id ? "Hide preview" : "Preview"}
                  </button>
                  <Link href={`/builder?id=${tool.id}`} className="text-sm underline">
                    Edit
                  </Link>
                </div>
              </div>
              <p className="text-xs text-black/40 dark:text-white/40">
                {VISIBILITY_COPY[tool.visibility]}
              </p>
              {expandedId === tool.id && (
                <iframe
                  src={`/tools/${tool.id}`}
                  title={`Preview of ${tool.name}`}
                  className="h-96 w-full rounded-lg border border-black/10 dark:border-white/10"
                />
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
