"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { createClient } from "@/lib/supabase/client";
import { ShareButton } from "@/components/ShareButton";
import { isMissingColumn } from "@/lib/toolColumns";

export const dynamic = "force-dynamic";

type CommunityTool = {
  id: string;
  name: string;
  created_at: string;
  theme_color: string | null;
};

/**
 * Browsable across every workspace — anyone, signed in or not, can see what
 * other people have published as "public". Deliberately no author
 * attribution shown yet (we only have owner_id/email, and publishing a
 * tool shouldn't out someone's email address); add a display_name field to
 * profiles before showing "by ...".
 */
export default function CommunityPage() {
  const supabase = createClient();
  const [tools, setTools] = useState<CommunityTool[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [query, setQuery] = useState("");

  useEffect(() => {
    async function load() {
      let result = await supabase
        .from("tools")
        .select("id, name, created_at, theme_color")
        .eq("visibility", "public")
        .order("created_at", { ascending: false })
        .limit(100);
      if (isMissingColumn(result.error)) {
        result = (await supabase
          .from("tools")
          .select("id, name, created_at")
          .eq("visibility", "public")
          .order("created_at", { ascending: false })
          .limit(100)) as typeof result;
      }
      const { data, error } = result;
      if (error) {
        setError(error.message);
        return;
      }
      setTools((data ?? []) as CommunityTool[]);
    }
    load();
  }, [supabase]);

  const filtered = useMemo(() => {
    if (!tools) return null;
    const q = query.trim().toLowerCase();
    if (!q) return tools;
    return tools.filter((t) => t.name.toLowerCase().includes(q));
  }, [tools, query]);

  return (
    <div className="mx-auto flex max-w-5xl flex-col gap-8 px-6 py-12">
      <div className="flex flex-col items-center gap-3 text-center">
        <h1 className="text-4xl font-semibold tracking-tight">Built by other people.</h1>
        <p className="max-w-md text-black/60 dark:text-white/60">
          Every tool here was made the same way yours would be — described, shaped, and published.
        </p>
        <input
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Search tools..."
          className="mt-2 w-full max-w-sm rounded-full border border-black/15 px-4 py-2 text-sm focus:border-black/40 focus:outline-none dark:border-white/20 dark:bg-transparent dark:focus:border-white/40"
        />
      </div>

      {error && <p className="text-center text-sm text-red-600">{error}</p>}

      {filtered === null ? (
        <p className="text-center text-sm text-black/50 dark:text-white/50">Loading…</p>
      ) : filtered.length === 0 ? (
        <p className="text-center text-sm text-black/50 dark:text-white/50">
          {tools && tools.length > 0 ? "No tools match that search." : "Nothing public yet — be the first."}
        </p>
      ) : (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {filtered.map((tool) => (
            <div
              key={tool.id}
              className="group relative flex flex-col gap-3 overflow-hidden rounded-2xl border border-black/10 p-5 transition hover:border-black/25 dark:border-white/10 dark:hover:border-white/25"
            >
              <div
                className="absolute inset-x-0 top-0 h-1.5"
                style={{ backgroundColor: tool.theme_color ?? "#171717" }}
              />
              <Link href={`/tools/${tool.id}`} className="flex flex-1 flex-col gap-1">
                <h2 className="font-medium">{tool.name}</h2>
                <span className="text-xs text-black/40 dark:text-white/40">
                  {new Date(tool.created_at).toLocaleDateString()}
                </span>
              </Link>
              <div className="flex items-center justify-between">
                <Link href={`/tools/${tool.id}`} className="text-xs underline">
                  Open
                </Link>
                <ShareButton url={`/tools/${tool.id}`} title={tool.name} />
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
